module.exports.login = function(username, password, callback)
{
	var client = require('./webclient');
	var cookie;
	client.get('e.tju.edu.cn', 80, '/Main/logon.do', function(data, headers){
		cookie = headers['set-cookie'][0].split(';')[0];
		client.post('e.tju.edu.cn', 80, '/Main/logon.do', 'uid=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password), function(data, headers){
			if (!headers['location'])
			{
				callback({'success': 0});
				return;
			}
			callback({'success': 1, 'cookie': cookie});
		}, 'GBK', cookie);
	}, 'GBK');
}

module.exports.getAchv = function(cookie, term, callback)
{
	var courses = [];
	var client = require('./webclient');
	client.get('e.tju.edu.cn', 80, '/Education/stuachv.do?todo=display&term=' + term, function(data, headers){
		data = data.replace(/[ \r\n\t]/gm, '');
		data = data.replace(/TableAltRowColor2/gm, 'TableRowColor');
		var mchs = data.match(/<tralign="center"bgcolor="#FFFFFF"height="25"valign="bottom"><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="left"><fontclass=ContextText2>&nbsp;&nbsp;([^<]*)<\/font><\/td><tdclass="TableRowColor"align="left"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><\/tr>/gm);
		for (var i in mchs)
		{
			var groups = mchs[i].match(/<tralign="center"bgcolor="#FFFFFF"height="25"valign="bottom"><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="left"><fontclass=ContextText2>&nbsp;&nbsp;([^<]*)<\/font><\/td><tdclass="TableRowColor"align="left"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><tdclass="TableRowColor"align="center"><fontclass=ContextText2>([^<]*)<\/font><\/td><\/tr>/);
			var course = {'term': groups[1], 'id': groups[2], 'name': groups[3], 'category': groups[4], 'type': groups[5], 'credit': groups[6], 'grade': groups[7], 'gradeType': groups[8], 'comment': groups[9]};
			courses.push(course);
		}
		callback(courses);
	}, 'GBK', cookie);
}

module.exports.getCreditTerms = function(cookie, callback)
{
	var terms = [];
	var client = require('./webclient');
	client.get('e.tju.edu.cn', 80, '/Education/stuachv.do', function(data, headers){
		data = data.replace(/[ \r\n\t]/gm, '');
		data = data.replace(/TableAltRowColor2/gm, 'TableRowColor');
		var mchs = data.match(/<ahref="\.\/stuachv\.do\?todo=display&term=(\d+)"class="titlelink">(\d+)<\/a>/gm);
		for (var i in mchs)
		{
			var groups = mchs[i].match(/<ahref="\.\/stuachv\.do\?todo=display&term=(\d+)"class="titlelink">(\d+)<\/a>/);
			terms.push(groups[1]);
		}
		callback(terms);
	}, 'GBK', cookie);
}