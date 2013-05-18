module.exports.open = function(name, callback)
{
	rrest.mongo(function(err, db, release){
		if (err) return;
		db.collection(name, {'safe': true}, function (err, coll){
			if (err) return;
			callback(coll, release);
		});
	});
}

module.exports.insert = function(name, row, callback)
{
	db.open(name, function (coll, release){
		coll.insert(row, function(err){
			if (err)
			{
				callback(false);
				release();
				return;
			}
			callback(true);
			release();
		});
	});
}

module.exports.getOne = function(name, param, callback)
{
	db.open(name, function (coll, release){
		coll.findOne(param, function(err, item){
			if (err)
			{
				callback();
				release();
				return;
			}
			callback(item);
			release();
		});
	});
}