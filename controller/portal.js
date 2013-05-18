var tpl = {};

function loadTpl()
{
	var tplDir = './tpl/';
	var fs = require('fs');
	var dirList = fs.readdirSync(tplDir);
	dirList.forEach(function(item){
		if(fs.statSync(tplDir + '/' + item).isFile())
		{
			var path = tplDir + '/' + item;
			var key = item.replace(/\.html/g, '');
			tpl[key] = fs.readFileSync(path);
		}
	});
}

loadTpl();

module.exports.auth = function(req, res)
{
	if (!req.param.userid)
	{
		res.send('invalid token');
		return;
	}
	var tplAuth = tpl['auth'].toString();
	tplAuth = tplAuth.replace(/\{\$userid\}/g, req.param.userid);
	if (req.method == 'POST')
	{
		var etju = require('../helper/etju');
		etju.login(req.param.username, req.param.password, function(resp){
			tplAuth = tplAuth.replace(/\{\$error\}/g, '登录失败，请输入正确的账号与密码');
			if (!resp.success)
			{
				res.send(tplAuth);
			}
			else
			{
				var authService = require('../helper/authservice');
				authService.bind(req.param.userid, req.param.username, req.param.password);
				res.send(tpl['auth_ok']);
			}
		});
		return;
	}
	tplAuth = tplAuth.replace(/\{\$error\}/g, '');
	res.send(tplAuth);
}
