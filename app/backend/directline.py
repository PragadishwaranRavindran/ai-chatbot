import os
import json
import aiohttp
from aiohttp import web

# Store conversations
conversations = {}

async def start_conversation(request):
    try:
        # Create a new conversation
        async with aiohttp.ClientSession() as session:
            async with session.post(
                'https://directline.botframework.com/v3/directline/conversations',
                headers={
                    'Authorization': f'Bearer {os.getenv("AZURE_DIRECT_LINE_SECRET")}',
                    'Content-Type': 'application/json'
                }
            ) as response:
                if not response.ok:
                    return web.json_response(
                        {'error': f'Direct Line API error: {response.status} {response.reason}'},
                        status=500
                    )
                
                conversation = await response.json()
                
                # Store conversation details
                conversations[conversation['conversationId']] = {
                    'conversation_id': conversation['conversationId'],
                    'token': conversation['token'],
                    'stream_url': conversation['streamUrl']
                }
                
                return web.json_response({
                    'id': conversation['conversationId'],
                    'directLineConversationId': conversation['conversationId'],
                    'token': conversation['token'],
                    'streamUrl': conversation['streamUrl']
                })
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def send_message(request):
    try:
        conversation_id = request.match_info['conversation_id']
        data = await request.json()
        text = data.get('text')
        
        if not text:
            return web.json_response({'error': 'No text provided'}, status=400)
            
        # Send message
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f'https://directline.botframework.com/v3/directline/conversations/{conversation_id}/activities',
                headers={
                    'Authorization': f'Bearer {os.getenv("AZURE_DIRECT_LINE_SECRET")}',
                    'Content-Type': 'application/json'
                },
                json={
                    'type': 'message',
                    'from': {'id': 'user'},
                    'text': text
                }
            ) as response:
                if not response.ok:
                    return web.json_response(
                        {'error': f'Direct Line API error: {response.status} {response.reason}'},
                        status=500
                    )
                
                return web.json_response(await response.json())
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def get_activities(request):
    try:
        conversation_id = request.match_info['conversation_id']
        watermark = request.query.get('watermark')
        
        # Get activities
        url = f'https://directline.botframework.com/v3/directline/conversations/{conversation_id}/activities'
        if watermark:
            url += f'?watermark={watermark}'
            
        async with aiohttp.ClientSession() as session:
            async with session.get(
                url,
                headers={
                    'Authorization': f'Bearer {os.getenv("AZURE_DIRECT_LINE_SECRET")}'
                }
            ) as response:
                if not response.ok:
                    return web.json_response(
                        {'error': f'Direct Line API error: {response.status} {response.reason}'},
                        status=500
                    )
                
                return web.json_response(await response.json())
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def clear_messages(request):
    try:
        conversation_id = request.match_info['conversation_id']
        # Clear conversation history
        if conversation_id in conversations:
            del conversations[conversation_id]
        return web.json_response({'status': 'success'})
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

def setup_directline_routes(app):
    app.router.add_post('/api/conversations/start', start_conversation)
    app.router.add_post('/api/conversations/{conversation_id}/messages', send_message)
    app.router.add_get('/api/conversations/{conversation_id}/activities', get_activities)
    app.router.add_delete('/api/conversations/{conversation_id}/messages', clear_messages) 