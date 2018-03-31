/*global jQuery, Handlebars, Router */
jQuery(function ($) {
	'use strict';

	Handlebars.registerHelper('eq', function (a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this);
	});

	var ENTER_KEY = 13;
	var ESCAPE_KEY = 27;

	var util = {
		uuid: function () {
			/*jshint bitwise:false */
			var i, random;
			var uuid = '';

			for (i = 0; i < 32; i++) {
				random = Math.random() * 16 | 0;
				if (i === 8 || i === 12 || i === 16 || i === 20) {
					uuid += '-';
				}
				uuid += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
			}

			return uuid;
		},
		pluralize: function (count, word) {
			return count === 1 ? word : word + 's';
		},
		store: function (namespace, data) {
			if (arguments.length > 1) {
				return localStorage.setItem(namespace, JSON.stringify(data));
			} else {
				var store = localStorage.getItem(namespace);
				return (store && JSON.parse(store)) || [];
			}
		}
	};

	var App = {
		init: function () {
			this.todos = util.store('todos-jquery');
			this.todoTemplate = Handlebars.compile($('#todo-template').html());
			this.footerTemplate = Handlebars.compile($('#footer-template').html());
			this.bindEvents();		// Create event listeners for all the possible actions

			new Router({
				'/:filter': function (filter) {
					this.filter = filter;
					this.render();
				}.bind(this)
			}).init('/all');
		},
		/**
		 * 	It should bind each HTML element to an action and run a specific function. this === App object {} // the this is App object pass into the bind(this), which pass into the method, otherwise inside that method this, refers to the element clicked
		 *	Parameters: N/A
		 *	Return: N/A
		 */
		bindEvents: function () {
			$('.new-todo').on('keyup', this.create.bind(this));		// id="new-todo" lifting up from key press
			$('.toggle-all').on('change', this.toggleAll.bind(this));		// id="toggle-all" any change on that element
			$('.footer').on('click', '.clear-completed', this.destroyCompleted.bind(this));		// id="footer" if you click on id="clear-completed"
			$('.todo-list')			// id="todo-list"  // method chaining
				.on('change', '.toggle', this.toggle.bind(this))		// any change on class="toggle"
				.on('dblclick', 'label', this.editingMode.bind(this))	// double clicking on element <label>
				.on('keyup', '.edit', this.editKeyup.bind(this))		// lifting from the key press on class="edit"
				.on('focusout', '.edit', this.update.bind(this))		// leaving focus such as esc
				.on('click', '.destroy', this.destroy.bind(this));		// one click on class="destroy"
		},
		render: function () {
			var todos = this.getFilteredTodos();		// this todos is more like a local todos and what you want displayed, this doesn't mess with this.todos which is coming from localStorage // get this.todos from localStorage and then set based on needs to var todos
			$('.todo-list').html(this.todoTemplate(todos));
			$('.main').toggle(todos.length > 0);
			$('.toggle-all').prop('checked', this.getActiveTodos().length === 0);
			this.renderFooter();
			$('.new-todo').focus();
			util.store('todos-jquery', this.todos);
		},
		renderFooter: function () {
			var todoCount = this.todos.length;
			var activeTodoCount = this.getActiveTodos().length;
			var template = this.footerTemplate({
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),
				completedTodos: todoCount - activeTodoCount,
				filter: this.filter
			});

			$('.footer').toggle(todoCount > 0).html(template);
		},
		/**
		 * 	It should change all this.todos.completed based on id="toggle-all" if it has checked exist true / else false
		 *	Parameters: e (jQuery Event Object)
		 *	Return: N/A
		 */
		toggleAll: function (e) {
			var isChecked = $(e.target).prop('checked');	// isChecked is equal to checked property // isChecked is Boolean

			this.todos.forEach(function (todo) {		// looop through each this.todos
				todo.completed = isChecked;			// set todo.completed to isChecked
			});

			this.render();
		},
		/**
		 * 	It should return Array of this.todos.completed that are false
		 *	Parameters: N/A
		 *	Return: (Array) of this.todos.completed that are false
		 */
		getActiveTodos: function () {
			return this.todos.filter(function (todo) {
				return !todo.completed;
			});
		},
		/**
		 * 	It should return Array of this.todos.completed that are false
		 *	Parameters: N/A
		 *	Return: (Array) of this.todos.completed that are true
		 */
		getCompletedTodos: function () {
			return this.todos.filter(function (todo) {
				return todo.completed;
			});
		},
		/**
		 * 	It should return Array of this.todos depending on there this.todos.completed status based on this.filter
		 *	Parameters: N/A
		 *	Return: (Array) of this.todos depending on there this.todos.completed status
		 */
		getFilteredTodos: function () {
			if (this.filter === 'active') {
				return this.getActiveTodos();
			}

			if (this.filter === 'completed') {
				return this.getCompletedTodos();
			}

			return this.todos;		// basically this.filter === 'all' and return al the todos
		},
		/**
		 * 	It should set this.todos to this.todos.completed that are false and set this.filter to all
		 *	Parameters: N/A
		 *	Return: N/A
		 */
		destroyCompleted: function () {
			this.todos = this.getActiveTodos();		// Setting this.todos to this.todos.completed that are false will erase this.todos.completed that is true
			this.filter = 'all';		// Setting it back to all with basically all the this.todos.completed that are false
			this.render();
		},
		// accepts an element from inside the `.item` div and
		// returns the corresponding index in the `todos` array
		/**
		 * 	It should return the this.todos index based on what was clicked.
		 * 	Parameters: el (String) ==> html element that was actioned on
		 * 	Return: i (Number) ==> index of this.todos
		 */
		getIndexFromEl: function (el) {		// from destroy: <button class="destroy"></button>
			var id = $(el).closest('li').data('id');	// element that was clicked, it's ancestor that was li and get the data-id
			var todos = this.todos;		// set this.todos to local todos
			var i = todos.length;		// number of todos

			while (i--) {		// loop through the todos starting at the end  // if i is 1, it will be true and decrement at the same time, making it 0 as it enters the loop, thus the next time will be 0 and false so loop stops
				if (todos[i].id === id) {		// if todos[i].id equal to the id we are looking for
					return i;					// return the i
				}
			}
		},
		create: function (e) {
			var $input = $(e.target);
			var val = $input.val().trim();

			if (e.which !== ENTER_KEY || !val) {
				return;
			}

			this.todos.push({
				id: util.uuid(),
				title: val,
				completed: false
			});

			$input.val('');

			this.render();
		},
		/**
		 * 	It should toggle true and false for this.todos[i].completed
		 *	Parameters: e (jQuery event Object)
		 *	Return: N/A
		 */
		toggle: function (e) {
			var i = this.getIndexFromEl(e.target);		// get the index position based on what is clicked
			this.todos[i].completed = !this.todos[i].completed;		// give me the opposite of this.todos[i].completed
			this.render();
		},
		editingMode: function (e) {
			var $input = $(e.target).closest('li').addClass('editing').find('.edit');
			var val = $input.val();
			$input.val('').focus().val(val);
		},
		editKeyup: function (e) {
			if (e.which === ENTER_KEY) {
				e.target.blur();
			}

			if (e.which === ESCAPE_KEY) {
				$(e.target).data('abort', true).blur();
			}
		},
		update: function (e) {
			var el = e.target;
			var $el = $(el);
			var val = $el.val().trim();

			if (!val) {
				this.destroy(e);
				return;
			}

			if ($el.data('abort')) {
				$el.data('abort', false);
			} else {
				this.todos[this.getIndexFromEl(el)].title = val;
			}

			this.render();
		},

		/**
		 *  It should delete one item from the this.todos based on index of a click
		 * 	and update the page
		 *	Parameters: e (jQuery Event object) [https://api.jquery.com/category/events/event-object/]
		 *	Return: N/A
		 */
		destroy: function (e) {										
			this.todos.splice(this.getIndexFromEl(e.target), 1);	// delete one item that was click from this.todos // <button class="destroy"></button>
			this.render();
		}
	};

	App.init();
});
