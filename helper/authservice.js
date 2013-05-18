module.exports.bind = function(userid, username, password)
{
	db.open('etjuAuth', function (coll, release){
		coll.remove({'userid': userid}, function(err) {
			coll.insert({'userid': userid, 'username': username, 'password': password, 'time': new Date()}, function(err){});
		});
	});
}

module.exports.unbind = function(userid)
{
	db.open('etjuAuth', function (coll, release){
		coll.remove({'userid': userid}, function(err) {});
	});
}

module.exports.get = function(userid, callback)
{
	db.open('etjuAuth', function (coll, release){
		coll.findOne({'userid': userid}, function(err, item){
			if (err || !item)
			{
				callback();
			}
			callback(item);
		});
	});
}
