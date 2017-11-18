import { Template } from 'meteor/templating';
import { Session } from 'meteor/session'


import './interface.html';

import { Games } from '../api/gamedata.js';


Template.interface.helpers({
  logged_in(){
    return (Meteor.userId() != null) ? true : false;
  },
  is_owner(){
    //if user not logged in, return false
    if (Meteor.userId() == null){
      return false;
    }
    //if user is owner among any games, return true, else false
    return (Games.findOne({owner: Meteor.userId()}) != null) ? true : false;
  },
  user_in_game(){
    //if user not logged in, return false
    if (Meteor.userId() == null){
      return false;
    }
    //if user is among any games, return true, else false
    return (Games.findOne({players: {$elemMatch: { 'playerID': Meteor.userId()}}}) != null) ? true : false;
  },
  current_game_code(){
    game = Games.findOne({players: {$elemMatch: { 'playerID': Meteor.userId()}}});
    if (game == null){
      return;
    }
    else{
      return game.code;
    }
  },
  players(){
    //checks if user is in game, if so, finds game, parses array into array of usernames
    return get_player_list({leader_highlight : true});
  },
  current_turn(){
    return get_current_game().currentTurn
  },
  tab: function() {
    return Template.instance().currentView.get();
  },
  viewData: function() {
  var tab = Template.instance().currentView.get();

  var data = {
    "books": [{ "name": "Seeking Wisdom: From Darwin to Munger", "creator": "Peter Bevelin" }],
    "movies": [{ "name": "Ghostbusters", "creator": "Dan Aykroyd" }],
    "games": [{ "name": "Grand Theft Auto V", "creator": "Rockstar Games" }]
  };
    return { contentType: tab, items: data[ tab ] };
  },
  chooseTemplate : function() {
    console.log(Session.get('currentView'))
    return Session.get('currentView');
  }
});

Template.interface.events({
  'click .toggle-new-game'() {
    // Set the checked property to the opposite of its current value
    Meteor.call('interface.newGame');
  },
  'submit .join-game'(event) {
    // Prevent default browser form submit
     event.preventDefault();

     // Get value from form element
     const target = event.target;
     const text = target.text.value;
     Meteor.call('interface.joinGame', text, Meteor.userId());
  },
  'click .nav-pills li'( event, template ) {
    Session.set('currentView', event.target.id);
  },
  'click .start-game'(event, target){
    console.log('begin game')
    //randomize player order

    var gamecode = event.target.value;
    Meteor.call('interface.shufflePlayers', gamecode, Meteor.userId())
    Meteor.call('interface.beginGame', gamecode, Meteor.userId());
  },
  'click .advance-turn'(event, target){
    console.log('advance turn')
    var gamecode = event.target.value;
    Meteor.call('interface.advanceTurn', gamecode, Meteor.userId());
  },

});

Template.action.helpers({
  isUserLeader(){
    return true;
  },
  players(){
    return get_player_list();
  },
});

Template.action.events({
  'submit .action-form'(event, template){
    // Prevent default browser form submit
    event.preventDefault();
    var gamecode = current_game_code()
    var selected = template.findAll( "input[type=checkbox]:checked");
    var array = selected.map(function(item){ return item.value})
    Meteor.call('action.submitParty', array, gamecode);
    //needs to submit to function that advances game state
    //updates everyone elses view
    //allows them to vote on next step
  }
});

Template.interface.onCreated( function() {
  this.currentView = new ReactiveVar( "content2" );
});

Template.content.helpers({
  getgame(){
    game = Games.findOne({players: {$elemMatch: { 'playerID': Meteor.userId()}}});
    return game;
  }
})




get_player_list = function(options){
  var options = options || {};
  var leader_highlight = options.leader_highlight || false;
  // options is object literal
  // defaults to false, if included
  // options.leader_highlight == true
  //returns an object {owner : 'owner', players : [players]
  game = Games.findOne({players: {$elemMatch: { 'playerID': Meteor.userId()}}})
  players = []
  if (game == null) {
    return;
  }
  else if (leader_highlight == true){
    owner = ''
    //iterates through player list, if a player is also owner, they are added to owner variable
    for (i=0; i<game.players.length; i++) {
      if (game.players[i].playerID == game.owner) {
        players.push({'username' : game.players[i].username, 'is_owner' : true});
      }
      else {
        players.push({'username' : game.players[i].username, 'is_owner' : false});
      }

    }
    return {
      'players' : players,
      'owner' : owner
    }
  }
  else{
    for (i=0; i<game.players.length; i++) {
      players.push(game.players[i].username)
    }
    return players
  }
}




get_current_game = function(){
  game = Games.findOne({players: {$elemMatch: { 'playerID' : Meteor.userId()}}});
  if (game == null){
    return;
  }
  else{
    return game;
  }
}
