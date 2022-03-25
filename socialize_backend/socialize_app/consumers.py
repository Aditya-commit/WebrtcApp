from channels.consumer import AsyncConsumer
from channels.exceptions import StopConsumer
import motor.motor_asyncio
import asyncio
import json

class VideoCall(AsyncConsumer):

	channel_id = ''

	async def connection(self):
		client = motor.motor_asyncio.AsyncIOMotorClient('127.0.0.1' , 27017)
		db = client['rtc_users']
		collection = db.user_info

		return collection

	async def add_user(self , user_name):

		collection = await self.connection()

		res_id = await collection.insert_one({'user_name' : user_name, 'channel_name' : self.channel_name , 'idle' : 'true'})

		return res_id

	async def search_idle_user(self , user_name):
		collection = await self.connection()

		res = await collection.find_one({'idle' : 'true' , 'user_name' : {'$not' : {'$eq' : user_name}}})

		return res
	
	async def update_idle(self , users , cond):
		collection = await self.connection()

		if len(users) == 1:
			res = await collection.update_many({'user_name' : users[0]} , {'$set' : {'idle' : cond}})

		elif len(users) == 2 :
			res = await collection.update_many({ '$or' : [ {'user_name' : users[0]} , {'user_name' : users[1]}]} , {'$set' : { 'idle' : cond }})

	async def delete_user(self , user_name):

		collection = await self.connection()

		res = await collection.delete_one({'user_name' : user_name})

	async def chat_message(self , event):
		await self.send({
			'type' : 'websocket.send',
			'text' : event['text']
		})

	async def websocket_connect(self ,event):

		user_name = self.scope['url_route']['kwargs']['user_name']

		await self.send({
			"type" : "websocket.accept",
		});

		id = await self.add_user(user_name)

		try:
			# IF THE RETURNED RESUTL CONTAINS THE INSERTED ID
			if (id.inserted_id) :

				success_msg = {'status' : 200 , 'msg' : 'user added succesfully'}

				# SEND SUCCESS MESSAGE TO THE USER
				await self.send({
					'type' : 'websocket.send',
					'text' : json.dumps(success_msg)
				})

				# SEARCH FOR AN IDLE USER TO PAIR UP
				user = await self.search_idle_user(user_name)
				
				if(type(user) == dict):

					await self.update_idle([user_name , user['user_name']] , 'false')

					# STORE THE STRANGER(RECEIVER) CHANNEL ID
					self.channel_id = user['channel_name']
					# IT MEANS THE USER IS PRESENT
					# SEND A MESSAGE TO THE USER TO CREATE AN OFFER
					notify_msg = {'status' : 201 , 'msg' : 'create_offer'}

					await self.send({
						'type' : 'websocket.send',
						'text' : json.dumps(notify_msg)
					})

		except Exception as e:
			err_msg = {'status' : 500 , 'msg' : 'User not added'}

			# SEND ERROR MESSAGE AND CLOSE THE CONNECTION
			await self.send({
				'type' : 'websocket.send',
				'text' : json.dumps(err_msg)
			})

	async def websocket_receive(self , event):
		error = 0
		try :
			msg = json.loads(event['text'])

		except :
			error = 1

		print(msg)

		if(error == 0):
			if('offer' in msg):
				offer_msg = {'offer' : msg['offer'] , '_id' : self.channel_name.split('.')[1]}
				await self.channel_layer.send(
					self.channel_id,
					{
						'type' : 'chat.message',
						'text' : json.dumps(offer_msg)
					}
				)

			elif('answer' in msg):
				await self.channel_layer.send(
					f"specific.{msg['id']}",
					{
						'type' : 'chat.message',
						'text' : event['text']
					}
				)

			elif('new-ice-candidate' in msg):
				if('id' in msg):
					await self.channel_layer.send(
						f"specific.{msg['id']}",
						{
							'type' : 'chat.message',
							'text' : json.dumps(msg['new-ice-candidate'])
						}
					)
				else :
					await self.channel_layer.send(
						self.channel_id,
						{
							'type' : 'chat.message',
							'text' : json.dumps(msg['new-ice-candidate'])
						}
					)

	async def websocket_disconnect(self , event):
		await self.send({
			'type' : 'websocket.disconnect'
		})

		user_name = self.scope['url_route']['kwargs']['user_name']

		await self.delete_user(user_name)

		raise StopConsumer()