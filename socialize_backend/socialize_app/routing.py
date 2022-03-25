from django.urls import re_path
from . import consumers

websocketurlpatterns = [
	re_path(r'ws/video_call/(?P<user_name>\w+)/$' , consumers.VideoCall.as_asgi()),	
]