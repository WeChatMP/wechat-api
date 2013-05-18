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
global.db = require('./helper/db');

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
	db.open('userData', function (coll, release){
		coll.update({'active': 1}, {
			$set: {'data': global.userData},
		}, function (){release();});
	});
}

global.reloadUserData = function()
{
	db.getOne('userData', {'active': 1}, function (item){
		if (item && item.data)
			global.userData = item.data;
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
	db.open('commandLog', function (coll, release){
		var row = {'time': new Date(), 'user': user, 'msg': msg, 'parsed': parsed};
		coll.insert(row, function(){release();});
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
	db.open('msgTemplate', function (coll, release){
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
	console.log('msg loaded');
}

global.loadCommand = function(callback)
{
	var pluginDir = './command/';
	var fs = require('fs');
	global.cmdDefs = [];
	global.purgeProc = {};
	var dirList = fs.readdirSync(pluginDir);
	dirList.forEach(function(item){
		if(fs.statSync(pluginDir + '/' + item).isFile())
		{
			delete require.cache[pluginDir + '/' + item.replace(/\.js/g, '')];
			fs.unlinkSync(pluginDir + '/' + item);
		}
	});
	db.open('commandSchema', function (coll, release){
		coll.find({'chain': {$gte: 0}}).sort({'chain': 1}).toArray(
			function(err, docs){
				for (var i in docs)
				{
					var obj = docs[i];
					var keyName = obj.key + '-' + Math.random();
					fs.writeFileSync(pluginDir + keyName + '.js', (obj.header ? obj.header : '') + '\r\n\r\nmodule.exports.parser = function(msg){\r\n' + obj.parser + '\r\n};\r\n\r\nmodule.exports.handler = function(data, callback){\r\n' + obj.handler + '\r\n};\r\n');
					var mod = require(pluginDir + keyName);
					var cmd = {'key': obj.key, 'name': obj.name, 'desc': obj.desc, 'param': obj.param, 'parse': mod.parser, 'handle': mod.handler};
					global.appendCmd(cmd);
					console.log('command init: ' + keyName + '(' + cmd.name + ')');
				}
				release();
				callback();
			}
		);
	});
	console.log('command loaded');
}

global.ready = function()
{
	global.http = require('http');
	global.server = global.http.createServer(
		function (req, res){
			var controller;
			global.requestCount ++;
			
			try
			{
				controller = require('./controller/' + req.path[0]);
			}
			catch(err)
			{
				res.statusCode = 404;
				res.send('no such method');
			}
			
			try
			{
				controller[req.path[1]](req, res);
			}
			catch(err)
			{
				console.log('error dump at ');
				console.log(new Date());
				console.log(req.path);
				console.log(req.apibody);
				console.log(err);
				/*res.statusCode = 500;
				res.send('internal error');*/
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