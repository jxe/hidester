// fb.js

var facebook_id, current_user_id, on_auth, m;
var F = new Firebase('https://songwalks.firebaseio.com');
var auth = new FirebaseSimpleLogin(F, function(error, user) {
	if (!user) return;
    current_user_id = user.uid;
    facebook_id      = user.id;
    facebook_name    = user.displayName;
	F.child('users').child(user.uid).update({
		name: user.displayName,
		facebook_id: facebook_id
	});
	var el = document.getElementById('login');
   if (el) el.style.display = 'none';
    if (on_auth) on_auth();
});
function fb(){
	var args = Array.prototype.slice.call(arguments);
	var str = args.shift();
	var path = str.replace(/%/g, function(m){ return args.shift(); });
	return F.child(path);
}
function with_user(cb){
	if (current_user_id) return cb();
	on_auth = cb;
	login();
}
