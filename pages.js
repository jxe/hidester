
// set up firebase
function login(){ auth.login('facebook', { rememberMe: true }); }
document.getElementById('login').onclick = login;
if (navigator.standalone) document.getElementsByTagName('body')[0].className = 'standalone';


// set up sc
SC.initialize({client_id: "43963acff2ef28ec55f039eddcea8478"});



window.reveal = firewidget.reveal;



// globals

var playlist;


// functions

function hop_to_room(room_id) {
    fb('rooms/%', room_id).once('value', function (snap) {
        var v = snap.val();
        v.id = room_id;
        unlock_page(v);
    });
}

function short_name(){
    if (!facebook_name) return "Anon";
    var words = facebook_name.split(' ');
    return words[0] + ' ' + words[1][0] + '.';
}

function compact(arr){
    return arr.filter(function(x){ return x; });
}

function join_room(r){
    fb('rooms/%/members/%', r.id, current_user_id).set({
        name: short_name(),
        facebook_id: facebook_id
    });
    show_room(r);
}

function user_is_in_location_for_room(r){
    var km = distance(r.start_loc[0], r.start_loc[1], curloc[0], curloc[1]);
    if (km < 1) return true;
}

function user_has_provided_password_for_room(room){
    return false;
}


function room_attributes_from_soundcloud_track(data){
    return {
        soundcloud_url: "/tracks/" + data.id,
        soundcloud_id: data.id,
        waveform_url: data.waveform_url,
        song_title: data.title,
        duration: data.duration / 1000,
        created_at: (new Date()).getTime()
    };
}


function nextSong(room){
    if (!playlist || playlist.errors || playlist.length === 0) return;
    var data = playlist.pop();
    fb('rooms/%', room.id).update(room_attributes_from_soundcloud_track(data));
    Player.stream('play', "/tracks/" + data.id);
}



// all pages


function rooms(){
    reveal('.page', 'rooms', {
        room_create: function(){
            var new_room = { author: current_user_id };
            new_room.id = fb('rooms').push(new_room).name();
            join_room(new_room);
        },
        rooms_list: [fb('rooms'), function(room_entry){
            if (room_entry.members && room_entry.members[current_user_id]) show_room(room_entry);
            else unlock_page(room_entry);
        }]
    });
}


function linkable_rooms(to_room){
    reveal('.page', 'linkable_rooms', {
        linked_room_create: function(){
            var new_room = { author: current_user_id };
            new_room.id = fb('rooms').push(new_room).name();
            link_room_to_room(to_room, new_room);
        },
        linkable_rooms_list: [fb('rooms'), function(room_entry){
            link_room_to_room(to_room, room_entry);
        }]
    });
}


function link_room_to_room(r, link_to_room) {
    var msg = prompt('Please provide a message that will appear with the link:');
    if (!msg) show_room(r);
    fb('rooms/%/backlinks/%', link_to_room.id, r.id).set(r);
    fb('room_messages/%', r.id).push({
        author: current_user_id,
        author_name: short_name(),
        link: link_to_room.id,
        text: msg + ": " + link_to_room.title
    });
    show_room(r);
}


function room_settings(r){
    if (r.soundcloud_url) Player.stream('load', r.soundcloud_url);
    reveal('.page', 'room_settings', {
        '.player': r.song_title,
        room_settings_play: function(){
            if (Player.current.sound) return Player.current.sound.togglePause();
            else return alert('No current sound');
        },
        room_settings_rewind: function(){
            if (Player.current.sound) Player.current.sound.setPosition(0);
        },
        room_settings_next: function(){
            nextSong(r);
        },

        go_room: function(){ show_room(r); },
        go_choose_song: function(){ choose_song(r); },
        room_attributes: [fb('rooms/%', r.id), {
            location: function(room){
                if (!room.start_loc) return "None yet.";
                else return room.start_loc[0] + ", " + room.start_loc[1];
            }
        }],
        set_title: function(){
            var title = prompt('Title?');
            if (title) fb('rooms/%', r.id).update({ title: title });
        },
        set_location_here: function(){
            with_loc(function(loc){
                fb('rooms/%', r.id).update({ start_loc: [loc.coords.latitude, loc.coords.longitude] });
            });
        },
    });
}




function choose_song(room){
    var search_results_updater;

    reveal('.page', 'choose_song', {
        go_room_settings: function(){ room_settings(room); },
        search_input: function(entry){
            SC.get('/tracks', { q: entry }, function(tracks) {
                document.getElementById('search_results').render(tracks);
            });
        },
        genres: [function(cb){
            cb([{name:'rock'}, {name:'jive'}]);
        }, function(clicked){
            SC.get('/tracks', { genres: clicked, order: 'hotness' }, function(tracks) {
                if (!tracks) return alert('no songs in that genre!');
                if (tracks.errors) { console.log(tracks);  return('attempt to fetch songs failed'); }

                playlist = shuffleArray(tracks);
                nextSong();
            });
        }],
        search_results: [[], function(clicked){
            // todo, play on search result click but don't set song
            fb('rooms/%', room.id).update(room_attributes_from_soundcloud_track(clicked));
        }]
    });
}




function show_room(r){
    if (r.soundcloud_url) Player.stream('load', r.soundcloud_url);
    reveal('.page', 'show_room', {
        '.player': r.song_title,
        room_play: function(){
            if (Player.current.sound) return Player.current.sound.togglePause();
            else return alert('No current sound');
        },
        room_rewind: function(){
            if (Player.current.sound) Player.current.sound.setPosition(0);
        },
        room_title: r.title || "New Room",
        room_requires: conjoin(compact([
            r.start_loc && 'being in a location',
            r.song_title && 'listening to a song',
            r.password && 'discovering a password'
            ])) || 'nothing special',
            edit_settings: [function(){
                if (r.author == current_user_id) room_settings(r);
            }, r.author == current_user_id],
            room_members: [fb('rooms/%/members', r.id), null, {
                photo_url: function(member){
                    return "http://graph.facebook.com/" + member.facebook_id + '/picture';
                }
            }],
            room_messages: [fb('room_messages/%', r.id), function(msg){
                hop_to_room(msg.link);
            }, {
                action: function (msg) {
                    if (msg.link) return "Follow link &raquo;";
                    else return '';
                }
            }],
            backlinks_section: r.backlinks,
            backlinks: [fb('rooms/%/backlinks', r.id), function(data){
                hop_to_room(data.id);
            }],
            message_add: function(entry){
                var msg = {
                    author: current_user_id,
                    author_name: short_name(),
                    text: entry
                };
                if (Player.current.sound) msg.t = Player.current.sound.position / 1000;
                fb('room_messages/%', r.id).push(msg);
            },
            room_link: function () { linkable_rooms(r); }
        });
    }





    function unlock_page(r){
        var remaining_requirements = [];
        var next_step;
        if (r.author == current_user_id) return join_room(r);
        if (r.start_loc && !user_is_in_location_for_room(r)){
            if (!next_step) next_step = 'check_location';
            remaining_requirements.push('go to the right location');
        }
        if (r.password && !user_has_provided_password_for_room(r)){
            if (!next_step) next_step = 'provide_password';
            remaining_requirements.push('provide a password');
        }
        if (r.song_title){
            if (!next_step) next_step = 'play_song';
            remaining_requirements.push('listen to the song '+ r.song_title);
        }
        if (!next_step) return join_room(r);
        reveal('.page', 'unlock_page', {
            remaining_requirements: "Blah blah blah",
            next_step_button: [function(){
                if (next_step == 'check_location'){
                    with_loc(function(loc){
                        if (user_is_in_location_for_room(r)) unlock_page(r);
                        else alert('not close enough');
                    });
                } else if (next_step == 'provide_password'){
                    // TODO
                } else if (next_step == 'play_song'){
                    Player.stream('play', "/tracks/" + r.soundcloud_url, null, {
                        whileplaying: function(){
                            var s = Player.current.sound.position / 1000;
                            if (s>20) join_room(r);
                        }
                    });
                }
            }, true, next_step.replace('_', ' ')]
        });
    }






    // m3

    function login_page(){ reveal('.page', 'login_page', { }); }






    // DONE

    function welcome_page(){
        reveal('.page', 'welcome_page', {
            room_no: function(entry){ show_room(entry); },
            go_nearby: function(){
                with_loc(function(){
                    near_you();
                });
            }
        });
    }



    rooms();
