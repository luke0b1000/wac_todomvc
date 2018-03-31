/*global jQuery, Handlebars, Router */
jQuery(function ($) {
	'use strict';

	// used in footer template to display the selected filter {{#eq filter 'all'}}class="selected"{{/eq}}
	// created a new helper called 'eq' custom behavior, comparing filter to 'all','active','completed'
	// this is only ONLY has this.footerTemplate object stuff, activeTodoCount, activeTodoWord, completedTodos, filter
	Handlebars.registerHelper('eq', function (a, b, options) {
		return a === b ? options.fn(this) : options.inverse(this); // options.fn(this): *** class="selected" *** , options.inverse(this): ""  // options.fn returns the true part of the block, options.inverse returns the else part of the block if there was one here
	});

	var ENTER_KEY = 13;		// used by this.create and this.editKeyup e.which is what is typed
	var ESCAPE_KEY = 27;	// used by this.editKeyup

	var util = {
		/**
		 * 	It should return a unique string for this.todos[i].id
		 *	Parameters: N/A
		 *	Return: uuid (String) "7be238ad-1262-42dc-a3ca-21630e576d78"
		 */
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
		/**
		 * 	It should add a 's' if count doesn't equal 1, otherwise don't add an 's' because count equals to 1
		 *	Parameters: count (string), word (string)
		 *	Return: word (string) with 's' or without
		 */
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
			this.todoTemplate = Handlebars.compile($('#todo-template').html());		// get <script id="todo-template" and the html and turn it into handlebars template
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
		/**
		 * 	It should display and update the view, every time the this.todos is modified.
		 *	Parameters: N/A
		 *	Return: N/A
		 */
		render: function () {
			var todos = this.getFilteredTodos();		// this todos is more like a local todos and what you want displayed, this doesn't mess with this.todos which is coming from localStorage // get this.todos from localStorage and then set based on needs to var todos // used for display
			$('.todo-list').html(this.todoTemplate(todos));	// get the todos that we want, then filling out the template (this.todoTemplate), once filled out, putting it in <ul class="todo-list"></ul> html element
			$('.main').toggle(todos.length > 0);		// as long as there are todos, then display <section class="main">, otherwise hide it
			$('.toggle-all').prop('checked', this.getActiveTodos().length === 0);	// set <input id="toggle-all" class="toggle-all" type="checkbox"> property of check to true if everything is completed/active todos is equal to zero
			this.renderFooter();		// run this.renderFooter()
			$('.new-todo').focus();		// Bring to focus <input class="new-todo" placeholder="What needs to be done?" autofocus> so you can start typing the next element
			util.store('todos-jquery', this.todos);		// use localStorage to store key:todos-jquery value:this.todos
		},
		/**
		 * 	It should display and update the footer, called from this.render()
		 *	Parameters: N/A
		 *	Return: N/A
		 */
		renderFooter: function () {
			var todoCount = this.todos.length;		// how many todos are there
			var activeTodoCount = this.getActiveTodos().length;		// how many active todos are there
			var template = this.footerTemplate({			// fill out this.footerTemplate with information below
				activeTodoCount: activeTodoCount,
				activeTodoWord: util.pluralize(activeTodoCount, 'item'),	// add 's' to 'item' if activeTodoCount doesn't equal to 1
				completedTodos: todoCount - activeTodoCount,		// alternative can use above this.getCompletedTodos().length // if there is value then the template will be true and show clear completed on html
				filter: this.filter			// Depending on the this.filter, it will only be true and class="selected" will be add to the element
			});

			$('.footer').toggle(todoCount > 0).html(template);	// display the <footer class="footer"></footer> if there are todos and 
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

			return this.todos;		// basically this.filter === 'all' and return all the todos
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
		/**
		 * 	It should take input, trim it, and add it into this.todos, clear out the element
		 *  This method executes this method every time a user keys up
		 *	Parameters: e (jQuery Event Object)
		 *	Return: undefined if you don't press enter, // executes this method every time a user keys up
		 */
		create: function (e) {
			var $input = $(e.target);		// e.target === <input id="new-todo" placeholder="What needs to be done?" autofocus="">, wrap in $(), will make it a jQuery Object
			var val = $input.val().trim();	// $input.val() === what was typed in

			if (e.which !== ENTER_KEY || !val) {	// e.which is what was typed in in numerics  // if you remove this, basically everytime you keyup it will add it into the this.todos right away without even pressing ENTER
				return;
			}

			this.todos.push({		// Add to this.todos an object with these values
				id: util.uuid(),	
				title: val,
				completed: false
			});

			$input.val('');		// clear out the element value, empty what was typed in

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
		/**
		 * 	It should make active the css #todo-list li.editing because it added a class="editing" to <li>, displaying the input box, getting me the element of class="edit" and allowing me to edit those values
		 *	Parameters: e (jQuery Event Object)
		 *	Return: N/A
		 */
		editingMode: function (e) {
			var $input = $(e.target).closest('li').addClass('editing').find('.edit'); // find element, find closest <li>, add <li class="editing">, get me the element <input class="edit">
			var val = $input.val();		// Get me the value <input class="edit" value="VALUE HERE">
			$input.val('').focus().val(val);	// Clear out the value, focus it back on the input box, and put in the value
		},
		/**
		 * 	It should only do something when you hit ENTER or ESC. but lose focus either way
		 *	Parameters: e (jQuery Event Object)
		 *	Return: N/A
		 */
		editKeyup: function (e) {
			if (e.which === ENTER_KEY) {		// if you press ENTER
				e.target.blur();				// lose focus on the input text box
			}

			if (e.which === ESCAPE_KEY) {				// if you press ESC
				$(e.target).data('abort', true).blur();		// set the element to have data with key to 'abort' and value is true, and lose focus // this data with key:'abort' value:true is used by the this.update to determine if it wants to put this value into this.todos or not
			}
		},
		/**
		 * 	It should update the this.todos[i]
		 *	Parameters: e (jQuery Event Object)
		 *	Return: undefined if no value exist
		 */
		update: function (e) {
			var el = e.target;				// get the element actioned
			var $el = $(el);				// convert to jquery object
			var val = $el.val().trim();		// get the value of the element

			if (!val) {						// if no value or empty space delete
				this.destroy(e);			// if nothing type in, then delete
				return;
			}

			if ($el.data('abort')) {		// if this was set to true from this.editKeyup then goto next line
				$el.data('abort', false);	// set the value to false and don't update and do nothing more
			} else {
				this.todos[this.getIndexFromEl(el)].title = val;	// set the value of this.todos[i]
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
