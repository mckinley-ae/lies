import { Template } from 'meteor/templating';
import { Session } from 'meteor/session'
import { Games, game_rules_template} from '../api/gamedata.js';
import { check_user_in_game, get_current_game, already_voted, get_player_list, checkbox_limit} from './general_functions.js'
import './interface.html';


if (Meteor.isClient) {

  Meteor.startup(function() {

  });

  Template.body.onCreated(function() {
      $(".fade-overlay").fadeIn();
  });

}


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
  players(){
    //checks if user is in game, if so, finds game, parses array into array of usernames
    return get_player_list({leader_highlight : true});
  },
// 12.7
//  tab: function() {
//    return Template.instance().currentView.get();
//  },
  chooseTemplate : function() {
    var game = get_current_game()
    if (game == null){
      return
    }
    //chooses what template everyone see
    else if (game.pass_fail_round == true){
      var current_turn = game.turnRecords.find(x => x.turn_number === game.currentTurn);
      var proposal = current_turn.votes.find(x => x.role === 'leader');
      var user = Meteor.users.findOne({_id : Meteor.userId()});
      if (proposal.proposal.includes(user.username)){
        return 'pass_fail_round_vote';
      }
      else {
        return 'pass_fail_round_wait';
      }
    }
    else {
      var player = game.players.find(x => x.playerID === Meteor.userId());
      return player.role;
    }
  },
  getVotes : function() {
    return game.turnRecords;
  }
});

Template.interface.events({
  'click .toggle-new-game'() {
    Meteor.call('interface.newGame');
  },
  'submit .join-game'(event) {
     event.preventDefault();
     const target = event.target;
     const text = target.text.value;
     Meteor.call('interface.joinGame', text, Meteor.userId());
  },
  'click .vote-on-proposal'(event, target){
    var vote = event.target.value;
    var gamecode = get_current_game().code;
    Meteor.call('addValueToTurnRecords', gamecode, vote);
  }
});

Template.leader.helpers({
  players(){
    return get_player_list();
  },
  already_voted(){
    if (check_user_in_game(Meteor.userId())){
      return already_voted();
    }
  }
});

Template.leader.events({
  'submit .action-form'(event, template){
    // Prevent default browser form submit
    event.preventDefault();
    var gamecode = get_current_game().code
    var selected = template.findAll( "input[type=checkbox]:checked");
    var array = selected.map(function(item){ return item.value})
    Meteor.call('addValueToTurnRecords', gamecode, array);
  },
  'click .party-checkbox'(event, target){
    var parent = $(event.currentTarget).parent().parent();
    var num_checked = $(parent.find('input[class="party-checkbox"]:checked').length)[0];
    var game = get_current_game()
    var num_players_allowed = game.turnRules.players_per_turn[game.currentTurn]
    if (num_checked >= num_players_allowed){
      $('#'+event.target.id).prop('checked', false);
    }
  }

});

Template.voter.helpers({
  get_proposal(){
    var game = get_current_game();
    var current_turn = game.turnRecords.find(x => x.turn_number === game.currentTurn);
    var proposal = current_turn.votes.find(x => x.role === 'leader');
    if (proposal == undefined){
      return false;
    }
    else{
      return proposal.proposal;
    }
  },
  already_voted(){
    return already_voted();
  }
});

Template.player_hud.helpers({
  current_game_code(){
    return get_current_game().code;
  },
  current_turn(){
    return get_current_game().currentTurn
  },
  current_role: function(){
    var player = get_current_game().players.find(x => x.playerID === Meteor.userId());
    return player.role;
  },
  current_players(){
    //checks if user is in game, if so, finds game, parses array into array of usernames
    return get_player_list({leader_highlight : true}).players;
  },
  pending_votes(playerID){
    //returns true if player has voted this round
    var game = get_current_game();
    var turn_records = game.turnRecords.find(x => x.turn_number == game.currentTurn);
    if (already_voted(playerID)){
       var vote = turn_records.votes.find(x => x.playerID == playerID);
       if (vote.proposal){
         return vote.proposal;
       }
       else if(vote.vote){
         return vote.vote;
       }
    }
    else{
      return false;
    }

  },
  get_voting_records(){
    var game = get_current_game();
    return game.turnRecords.find(x => x.turn_number == game.currentTurn);
    //var current_turn = game.turnRecords.find(x => x.turn_number === game.currentTurn);
    //return current_turn.votes;
  }
});

Template.owner_toolbar.helpers({
  owner_admin(){
    if (Meteor.userId() == null){
      return false;
    }
    //if user is owner among any games, return 'owner_admin', else false
    return (Games.findOne({owner: Meteor.userId()}) != null) ? 'is_owner' : 'not_owner';
  },
  current_game_code(){
    return get_current_game().code;
  },
  game_not_started(){
    var game = get_current_game();
    return (game.acceptingnewplayers == true) ? true : false;
  }
})

Template.owner_toolbar.events({
  'click .start-game'(event, target){
    var gamecode = event.target.value;
    Meteor.call('interface.beginGame', gamecode, Meteor.userId());
  },
  'click .advance-turn'(event, target){
    var gamecode = event.target.value;
    Meteor.call('interface.advanceTurn', gamecode, Meteor.userId());
  },
  'click .end-game'(event, target){

    console.log('sads');
  }
})



Template.pass_fail_round_vote.helpers({
  is_evil(){
    var game = get_current_game();
    var player = game.players.find(x => x.playerID === Meteor.userId());
    return (player.secretRole == 'evil' ) ? true : false;
  },

})

Template.pass_fail_round_vote.events({
  'click .vote-on-pass-fail'(event, target){
    var vote = event.target.value;
    var gamecode = get_current_game().code;
    Meteor.call('vote_on_pass_fail', gamecode, vote);
  }

})


Template.hidden_info_modal.events({
  'click .show_modal'(event) {
    event.preventDefault();
    $('#hidden_info_modal').modal('show');
  }
})

Template.hidden_info_modal.helpers({
  hidden_info(){
    var to_return = {};
    var game = get_current_game();
    var player = game.players.find(x => x.playerID === Meteor.userId());
    to_return['player_role'] = player.secretRole;
    if (player.secretRole == 'evil' ||
        player.secretRole == 'merlin'){
      to_return['evil_players'] = game.players.filter(x => x.secretRole === 'evil');
    }
    return to_return;
  }
  //send note???
})

Template.game_score.helpers({
  current_score(){
    var game_score = get_current_game().currentScore.display;
    var display = [];
    for (i = 0; i <= 5; i++){
      if (i <= game_score.length){
        switch (game_score[i]){
          case 'good':
            display.push('green');
            break;
          case 'evil':
            display.push('red');
            break;
        }
      }
      else{
          display.push('grey')
      }
    }
    return display;
  }
})
