// firewidget.js



// tinywidgets


(function(){
	var subs = {}, sub_scope, domains = {}, special_evs = {};
	window.firewidget = function(a, b){
		if (!a.trim) { for (var x in a) firewidget(x, a[x]); return; }
		firewidget.unsub(sub_scope = a);
		var els = document.getElementById(a) || document.querySelectorAll(a);
		if (!b || !b.sort) b = [b];
		if (els.length === undefined) els = [els];
		if (!els[0]) return alert(a + " not found.");
		for (var el_i = els.length - 1; el_i >= 0; el_i--) {
			var el = els[el_i], found = false;
			for (var i = el.classList.length - 1; !found && i >= 0; i--) {
				var c = firewidget.widgets[ el.classList[i] ];
				if (c) { found = true; c(el, b[0], b[1], b[2], b[3], b[4]); }
			}
			if (!found) b[0](el, firewidget.sub);
		}
	};
	firewidget.sub = function(ref, ev, f){
		if (!subs[sub_scope]) subs[sub_scope] = [];
		if (special_evs[ev]) return special_evs[ev](subs[sub_scope], ref, f);
		subs[sub_scope].push(function(){ if (ref.off) ref.off(ev,f); else ref.removeEventListener(ev,f); });
		if (ref.on) ref.on(ev, f); else ref.addEventListener(ev, f);
	};
	firewidget.unsub = firewidget.close = function(scope){
		if (!scope) scope = Object.keys(subs);
		if (scope.forEach) scope.forEach(function(s){ firewidget.unsub(s); });
		if (subs[scope]) subs[scope].forEach(function(sub){ sub(); });
		delete subs[scope];
	};
	firewidget.reveal = function(domain, id, wires){
		var elements = document.querySelectorAll(domain);
		Array.prototype.forEach.call(elements, function(el){ el.style.display = 'none'; });
		document.getElementById(id).style.display = '';
		if (domains[domain]) firewidget.unsub(domains[domain]);
		domains[domain] = Object.keys(wires || {});
		if (wires) firewidget(wires);
	};
	if (window.Hammer){
		special_evs.click = function(subs, ref, f){
			firewidget.sub(Hammer(ref), 'tap', function(ev){
				ev.gesture.stopPropagation();
				ev.gesture.preventDefault();
				f.call(this, ev);
			});
		};
		special_evs.dblclick = function(subs, ref, f){
			firewidget.sub(Hammer(ref), 'doubletap', function(ev){
				ev.gesture.stopPropagation();
				ev.gesture.preventDefault();
				f.call(this, ev);
			});
		};
		special_evs.swipe = function(subs, ref, f){
			firewidget.sub(Hammer(ref), 'dragleft dragright swipeleft swiperight', function(ev){
				// ev.gesture.stopPropagation();
				ev.gesture.preventDefault();
				if(ev.type == 'dragleft' || ev.type == 'dragright') return;
				f.call(this, ev);
				// ev.gesture.stopDetect();
			});
		};
	}
	firewidget.widgets = {
		simple_label: function(el, value){
			el.innerHTML = value;
		},
		simple_input: function(el, onchange){
			firewidget.sub(el.form, 'submit', function(ev){ onchange(el.value); ev.preventDefault(); el.value = ''; el.blur(); return false; });
		},
		simple_hidable: function(el, shown){
      el.show = function(shown){
        if (!shown){
          el.classList.add('hiding');
          el.classList.add('hidden');
          el.style.display = 'none';
          el.classList.remove('hiding');
        } else {
          el.classList.add('revealing');
          el.style.display = '';
          el.classList.remove('revealing');
          el.classList.add('revealed');
        }
      };
      el.show(shown);
		},
		simple_button: function(el, does, shown){
			if (shown !== undefined && !shown) el.style.display = 'none';
			else if (shown) el.style.display = '';
			firewidget.sub(el, 'click', function (ev) { ev.preventDefault(); does(el); return false; });
		},
		simple_toggle: function(el, does, start_state){
      var state = start_state;
      el.state = function(s){
        state = s;
        if (state) el.classList.add('on');
        else el.classList.remove('on');
        does(state, el);
      };
			firewidget.sub(el, 'click', function (ev) {
        ev.preventDefault();
        el.state(!state);
        return false;
      });
		},
		simple_list: function(el, array, onclick, id_pfx){
			if (!id_pfx) id_pfx = '';
			el.render = function(array){
				mikrotemplate(el, array, id_pfx);
				if (!onclick) return;
				var children = el.childNodes;
				var f = function(ev){ onclick( this.data, ev, this ); };
				for (var i = children.length - 1; i >= 0; i--) children[i].onclick = f;
			};
			if (array) el.render(array);
		},
		simple_tabs: function (el, tabnames, onchange, default_tab) {
			var array = tabnames.map(function (n) { return {name: n}; });
			mikrotemplate(el, array);
			var children = el.childNodes;
			var f = function(ev, tab_el){
				if (!tab_el) tab_el = this;
				var prev_selected = el.querySelectorAll('.selected');
				Array.prototype.forEach.call(prev_selected, function(x){ x.setAttribute('class', ''); });
				tab_el.setAttribute('class', 'selected');
				onchange( tab_el.data.name, ev );
			};
			for (var i = children.length - 1; i >= 0; i--){
				children[i].onclick = f;
				if (children[i].data.name == default_tab) f(null, children[i]);
			}
		}
	};
})();






// tinytemplate

function mikrotemplate(el, obj_or_array, id_pfx){
	function decorate_element(el, json){
		var directives = el.getAttribute('data-set') ? el.getAttribute('data-set').split(' ') : [];
		directives.forEach(function(word){
			var parts = word.split(':');
			var attr = parts[0];
			var path = parts[1] || parts[0];
			if (attr == 'text')       el.innerHTML = json[path];
			else if (attr == 'value') el.value = json[path];
			else el.setAttribute(attr, json[path]);
		});
	}
	function decorate_subtree(el, json){
		el.data = json;
		decorate_element(el, json);
		var matches = el.querySelectorAll('[data-set]');
		for (var i = 0; i < matches.length; i++) decorate_element(matches[i], json);
	}
	if (!id_pfx) id_pfx = '';
	if (!obj_or_array) return;
	if (!obj_or_array.forEach) return decorate_subtree(el, obj_or_array);
	if (!mikrotemplate.templates) mikrotemplate.templates = {};
	if (!mikrotemplate.templates[el.id]) mikrotemplate.templates[el.id] = el.firstElementChild.cloneNode(true);
	el.innerHTML = "";
	obj_or_array.forEach(function(o){
		var clone = mikrotemplate.templates[el.id].cloneNode(true);
		clone.id = id_pfx + o.id;
		decorate_subtree(clone, o);
		el.appendChild(clone);
	});
}




// tinyfire



(function(){
	var sub = firewidget.sub, w = firewidget.widgets;

	function values(obj){
		if (!obj) return [];
		return Object.keys(obj).map(function(x){ obj[x].id = x; return obj[x]; });
	}

	w.fbobjlist = function(el, ref, onclick, options){
		if (!options) options = {};
		var id_prefix = options.id_prefix || '';
		el.redraw = function(){ el.render(el.data); };
		el.render = function (array) {
			el.data = array;
			if (options.filter) array = options.filter(array);
			if (options.sort)   array = options.sort(array);
			array.forEach(function(o){
				for (var opt in options){
					if (opt[0] == '.') o[opt.slice(1)] = options[opt](o, el);
				}
			});
			mikrotemplate(el, array, id_prefix);
            var children = el.childNodes;
			if (onclick) {
               var f = function(ev){ onclick( this.data, ev, this ); };
			   for (var i = children.length - 1; i >= 0; i--) sub(children[i], 'click', f);
			}
			if (options.swipe) {
				var f = function(ev){ options.swipe( this.data, ev, this ); };
                for (var i = children.length - 1; i >= 0; i--) sub(children[i], 'swipe', f);
			}
			if (options.dblclick) {
				var f = function(ev){ options.dblclick( this.data, ev, this ); };
                for (var i = children.length - 1; i >= 0; i--) sub(children[i], 'dblclick', f);
			}
		};
		el.update_row = function (o) {
			var item = document.getElementById(id_prefix + o.id);
			mikrotemplate(item, o, id_prefix);
		};
		el.set_row_value = function (o, k, v) {
			var item = document.getElementById(id_prefix + o.id);
			o = item.data;
			o[k] = v;
			mikrotemplate(item, o, id_prefix);
		};
		sub(ref, 'value', function(snap){ el.render(values(snap.val())); });
	};


	w.fbobj = function(el, ref, calcfns){
		sub(ref, 'value', function(snap){
			var o = snap.val() || {};
			if (calcfns) {
				for (var k in calcfns){ o[k] = calcfns[k](o); }
			}
			mikrotemplate(el, o);
		});
	};

	w.fbtablist = function(el, ref_options, ref_selected, onchange){
		var last_value;
		function select_item(parent, child){
			var prev_selected = parent.querySelectorAll('.selected');
			Array.prototype.forEach.call(prev_selected, function(x){ x.setAttribute('class', ''); });
			child.setAttribute('class', 'selected');
		}
		sub(ref_options, 'value', function(snap){
			var value = snap.val();
			var array = value ? values(value) : [];
			mikrotemplate(el, array);
			var children = el.childNodes;
			var f = function(ev){
				select_item(el, this);
				last_value = this.data;
				if (ref_selected) ref_selected.set(this.data);
				if (onchange) onchange(this.data);
			};
			for (var i = children.length - 1; i >= 0; i--) children[i].onclick = f;
			sub(ref_selected, 'value', function(snap){
				var v = snap.val();
				if (v){
					var to_select = document.getElementById(v.id || v);
					if (to_select) select_item(el, to_select);
				}
				if (onchange && last_value != v) onchange(v);
			});
		});
	};



	w.fbselectlist = function(el, ref_selected, ref_options, onchange){
		sub(ref_options, 'value', function(snap){
			var value = snap.val();
			var array = value ? values(value) : [];
			mikrotemplate(el, array);

			sub(ref_selected, 'value', function(snap){
				var v = snap.val();
				$(el).val(v);
				if (onchange) onchange(v);
			});
		});
		sub($(el), 'change', function(ev){
			if (!this.value) ref_selected.remove();
			else ref_selected.set(this.value);
			if (onchange) onchange(this.value);
		});
	};


	w.fbselect = function(el, ref, onchange){
		sub(ref, 'value', function(snap){
			var v = snap.val();
			$(el).val(v);
			if (onchange) onchange(v);
		});
		sub($(el), 'change', function(ev){
			if (!this.value) ref.remove();
			else ref.set(this.value);
			if (onchange) onchange(this.value);
		});
	};

	w.fbtextfield = function (el, ref) {
		sub(ref, 'value', function(snap){
			var v = snap.val();
			el.value = v;
		});
		sub(el.form, 'submit', function(ev){
			ev.preventDefault();
			if (el.value) ref.set(el.value);
			else ref.remove();
			return false;
		});
	};

	// requires jquery and the twitter typeahead.js thing
	w.fbtypeahead = function(el, ref, onchange){
		var options = [];

		sub(ref, 'value', function(snap){
			options = values(snap.val());
			console.log(el.id, "typeahead got values", options);
		});

		sub($(el.form), 'submit', function(ev){
			ev.preventDefault();
			onchange({ name: el.value });
			$(el).typeahead('val', '');
			return false;
		});

		sub($(el), 'typeahead:selected', function(ev, data){
			onchange(data);
			$(el).typeahead('val', '');
		});

		$(el).typeahead('destroy');
		$(el).typeahead({autoselect:true}, {
			displayKey: 'name',
			source: function(query, cb){
				var q = query && query.toLowerCase();
				cb(options.filter(function(x){
					return !query || (x.name&&x.name.toLowerCase().indexOf(q) >= 0);
				}));
			}
		});
		$(el).typeahead('val', '');
	};

})();
