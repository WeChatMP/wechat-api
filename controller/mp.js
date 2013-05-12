function auth(req, res)
{
	res.send(req.getparam.echostr);
}

module.exports.push = function(req, res)
{
	if (!req.apibody)
	{
		if (req.getparam.signature)
		{
			auth(req, res);
		}
		else
		{
			res.send('bad request');
		}
		return;
	}
	
	var data;
	var user = {'openid': req.apibody['xml']['FromUserName'][0]};
	var msgType = req.apibody['xml']['MsgType'][0];
	
	global.hitCount ++;
	switch (msgType)
	{
		case 'text':
			global.processMsg(user.openid, req.apibody['xml']['Content'][0], 
				function(_data){
					data = _data;
				}, 
				function(reply, msgParam){
					var replyMsg = global.formatMsg(reply, msgParam);
					if (data && data.command)
					{
						global.logMsg(user, req.apibody['xml']['Content'][0], {'key': data.command.key, 'params': data.param, 'reply': reply, 'msgParam': msgParam, 'replyMsg': replyMsg});
					}
					else
					{
						global.logMsg(user, req.apibody['xml']['Content'][0], {'reply': reply, 'msgParam': msgParam, 'replyMsg': replyMsg});
					}
					try
					{
						if (reply == 'news')
						{
							res.api({
								'ToUserName': req.apibody['xml']['FromUserName'][0],
								'FromUserName': req.apibody['xml']['ToUserName'][0],
								'CreateTime': req.apibody['xml']['CreateTime'][0],
								'MsgType': 'news',
								'ArticleCount': msgParam.items.length,
								'Articles': {'item': msgParam.items},
								'FuncFlag': 1
							});
						}
						else
						{
							res.api({
								'ToUserName': req.apibody['xml']['FromUserName'][0],
								'FromUserName': req.apibody['xml']['ToUserName'][0],
								'CreateTime': req.apibody['xml']['CreateTime'][0],
								'MsgType': msgType,
								'Content': replyMsg,
								'FuncFlag': 0
							});
						}
					}
					catch (e)
					{
					}
				}
			);
			break;
		case 'event':
			var event = req.apibody['xml']['Event'][0];
			if (event == 'subscribe')
			{
				//global.setOpenID(user.openid, true);
				res.api({
					'ToUserName': req.apibody['xml']['FromUserName'][0],
					'FromUserName': req.apibody['xml']['ToUserName'][0],
					'CreateTime': req.apibody['xml']['CreateTime'][0],
					'MsgType': 'text',
					'Content': global.formatMsg('describe'),
					'FuncFlag': 0
				});
			}
			if (event == 'unsubscribe')
			{
				//global.setOpenID(user.openid, false);
			}
			break;
	}
}
