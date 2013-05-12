module.exports.status = function(req, res)
{
	res.api({'status': 'running', 'uptime': (new Date().getTime() - global.uptime.getTime()) / 1000, 'request': global.requestCount, 'hit': global.hitCount});
}

module.exports.signal = function(req, res)
{
	if (!req.apibody)
	{
		res.send('bad request');
		return;
	}
	var sig = req.apibody.signal;
	
	if (sig == 'reloadCmdDefs')
	{
		global.loadCommand(function(){});
	}
	else if (sig == 'reloadMsgDefs')
	{
		global.loadMsg();
	}
	else if (sig == 'purge')
	{
		for (var i in global.purgeProc)
		{
			global.purgeProc[i].purge();
		}
	}
	
	res.api({'success': 1});
}

module.exports.command = function(req, res)
{
	if (!req.apibody)
	{
		res.send('bad request');
		return;
	}
	var msg = req.apibody.command;
	var data;
	global.processMsg('root', msg, 
		function(_data){
			data = _data;
		}, 
		function(reply, msgParam){
			var replyMsg = global.formatMsg(reply, msgParam);
			var obj;
			if (data && data.command)
			{
				obj = {'key': data.command.key, 'params': data.param, 'reply': reply, 'msgParam': msgParam, 'replyMsg': replyMsg};
			}
			else
			{
				obj = {'reply': reply, 'msgParam': msgParam, 'replyMsg': replyMsg};
			}
			res.api(obj);
		}
	);
}
