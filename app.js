module.exports.conf = require('./config/config');
module.exports.rrestconfig = require('./config/config');

global.uptime = new Date();
global.msgDefs = {};
global.purgeProc = {};
global.userData = {};
global.cmdDefs = [];
global.server = {};
global.requestCount = 0;
global.hitCount = 0;

global.http = require('http');
global.rrest = require('rrestjs');

global.getUserData = function(openid)
{
	if (!global.userData[openid])
	{
		global.userData[openid] = {};
	}
	global.userData[openid].lastActive = new Date();
	return global.userData[openid];
}

global.flushUserData = function()
{
	rrest.mongo(function(err, db, release){
		if (err) return;
		db.collection('userData', {'safe': true}, function (err, coll){
			coll.update({'active': 1}, {
				$set: {'data': global.userData},
			}, function (){release();});
		});
	});
}

global.reloadUserData = function()
{
	rrest.mongo(function(err, db, release){
		if (err) return;
		db.collection('userData', {'safe': true}, function (err, coll){
			coll.findOne({'active': 1}, function(err, item){
				if (!err && item && item.data)
					global.userData = item.data;
				release();
			});
		});
	});
}

global.formatMsg = function(id, params)
{
	var text = global.msgDefs[id];
	if (!text)
	{
		return id;
	}
	if (params)
	{
		for (var key in params)
		{
			var value = params[key];
			text = text.replace(new RegExp('\\{\\$' + key.replace(/\_/gm, '\\_') + '\\}', "gm"), value);
		}
	}
	return text;
}

global.appendCmd = function(cmd)
{
	global.cmdDefs.push(cmd);
}

global.logMsg = function(user, msg, parsed)
{
	rrest.mongo(function(err, db, release){
		if (err) return;
		db.collection('commandLog', {'safe': true}, function (err, coll){
			var row = {'time': new Date(), 'user': user, 'msg': msg, 'parsed': parsed};
			coll.insert(row, function(){release();});
		});
	});
}

global.parseMsg = function(msg)
{
	try
	{
		msg = msg.replace(/  /mg, ' ');
		for (var i in global.cmdDefs)
		{
			var param;
			if (param = global.cmdDefs[i].parse(msg))
			{
				return {'command': global.cmdDefs[i], 'param': param};
			}
		}
	}
	catch (e)
	{
		console.log(e);
	}
	return undefined;
}

global.processMsg = function(userid, msg, setdata, callback)
{
	var data = parseMsg(msg);
	setdata(data);
	if (!data || !data.command)
	{
		callback('invalid_msg');
		return;
	}
	try
	{
		data.userid = userid;
		data.user = global.getUserData(userid);
		data.finished = false;
		data.timer = setTimeout(function(){
			if (data.finished) return;
			data.finished = true;
			callback('timeout');
		}, 1500);
		data.command.handle(data, function(reply, msgParam){
			if (data.finished) return;
			clearTimeout(data.finished);
			data.finished = true;
			callback(reply, msgParam);
		});
	}
	catch (e)
	{
		callback('error', {'error': e});
	}
}

global.loadMsg = function()
{
	var fs = require('fs');
	global.msgDefs = {};
	rrest.mongo(function(err, db, release){
		if (err)
		{
			console.log(err);
			release();
			return;
		}
		db.collection('msgTemplate', {'safe': true}, function (err, coll){
			coll.find().toArray(
				function(err, docs){
					for (var i in docs)
					{
						var obj = docs[i];
						global.msgDefs[obj.id] = obj.text;
					}
					release();
				}
			);
		});
	});
	console.log('msg loaded');
}

global.loadCommand = function(callback)
{
	var fs = require('fs');
	global.cmdDefs = [];
	rrest.mongo(function(err, db, release){
		if (err)
		{
			console.log(err);
			release();
			return;
		}
		console.log('mongo db connected');
		db.collection('commandSchema', {'safe': true}, function (err, coll){
			coll.find({'chain': {$gte: 0}}).sort({'chain': 1}).toArray(
				function(err, docs){
					for (var i in docs)
					{
						var obj = docs[i];
						fs.writeFileSync('./command/' + obj.key + '.js', (obj.header ? obj.header : '') + 'module.exports.parser = function(msg){' + obj.parser + '};module.exports.handler = function(data, callback){' + obj.handler + '};');
						delete require.cache['./command/' + obj.key];
						var mod = require('./command/' + obj.key);
						var cmd = {'key': obj.key, 'name': obj.name, 'desc': obj.desc, 'param': obj.param, 'parse': mod.parser, 'handle': mod.handler};
						global.appendCmd(cmd);
						console.log('command stub: ' + cmd.key + ' (' + cmd.name + ')');
					}
					release();
					callback();
				}
			);
		});
	});
	console.log('command loaded');
}

global.ready = function()
{
	global.http = require('http');
	global.server = global.http.createServer(
		function (req, res){
			global.requestCount ++;
			try{
				require('./controller/' + req.path[0])[req.path[1]](req, res);
			}
			catch(err)
			{
				res.statusCode = 404;
				res.send('no such method');
			}
		}).listen(rrest.config.listenPort);
	console.log('http server up');
}

function initWechat()
{
	global.loadCommand(global.ready);
	global.loadMsg();
}

global.serverProc = function()
{
	global.flushUserData();
	clearTimeout(global.serverLoop);
	global.serverLoop = setTimeout(global.serverProc, 60000);
}

initWechat();
global.reloadUserData();
global.serverLoop = setTimeout(global.serverProc, 5000);