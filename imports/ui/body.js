import { Meteor } from 'meteor/meteor';

import { Template } from 'meteor/templating';
import { ReactiveDict } from 'meteor/reactive-dict';

import './body.html';
import './interface.html';
import './interface.js';

Template.body.onCreated(function bodyOnCreated() {
  this.state = new ReactiveDict();
  Meteor.subscribe('games')
});



Template.body.helpers({

});

Template.body.events({

});
