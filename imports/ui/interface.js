import { Template } from 'meteor/templating';
import { Session } from 'meteor/session'
import { Games, Triggers, game_rules_template} from '../api/gamedata.js';
import { fade, check_user_in_game, get_current_game, already_voted, get_player_list, checkbox_limit} from './general_functions.js'
import './interface.html';


if (Meteor.isClient) {

  Meteor.startup(function() {

  });

  Template.body.onRendered(function() {

  });


  Triggers.find().observe({
    //monitors changes to Triggers database, calls animation functions
    changed: function(newDocument, oldDocument) {
      console.log(newDocument)
      console.log(Session.get('gamecode'));
      var gamecode = newDocument.code;
      var trigger = newDocument.triggers[newDocument.triggers.length-1]
      console.log(gamecode, trigger);
      if (newDocument.gamecode == Session.get('gamecode')){
        fade(newDocument.triggers[newDocument.triggers.length])
      }
    }
  });

}


Template.interface.helpers({
  game_over(){
    return get_current_game().gameOver
  },
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
    //return (Games.findOne({players: {$elemMatch: { 'playerID': Meteor.userId()}}}) != null) ? true : false;
    return get_current_game();
  },
  players(){
    //checks if user is in game, if so, finds game, parses array into array of usernames
    return get_player_list({leader_highlight : true});
  },
  game_not_over(){
    var game = get_current_game();
    return game.gameOver
  },
  chooseTemplate : function() {
    var game = get_current_game()
    if (game == undefined){
      return;
    }
    else if (game.inprogress == false){
      //game not started
      return 'waiting_for_players';
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
  },
  screen_overlay_message(){
    return Session.get("screen_overlay_message");
  }
});

Template.interface.events({
  'click .notreal'(){
    fade('test session');
  },
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
  },
  invalid_proposal(){
    return Session.get('invalid_proposal');
  },
  num_players_allowed(){
    var game = get_current_game();
    return game.turnRules.players_per_turn[game.gameRound];
  }
});

Template.leader.events({
  'click #submit_party'(event, template){
    // Prevent default browser form submit
    event.preventDefault();
    var game = get_current_game();
    var num_players_allowed = game.turnRules.players_per_turn[game.gameRound];
    var gamecode = get_current_game().code
    var selected = template.findAll( "input[type=checkbox]:checked");
    var array = selected.map(function(item){ return item.value})
    if (array.length == num_players_allowed) {
      Meteor.call('addValueToTurnRecords', gamecode, array);
    }
    else{
      Session.set('invalid_proposal', true);
    }
  },
  'click .party-checkbox'(event, target){
    var parent = $(event.currentTarget).parent().parent();
    var num_checked = $(parent.find('input[class="party-checkbox"]:checked').length)[0];
    var game = get_current_game()
    var num_players_allowed = game.turnRules.players_per_turn[game.gameRound]
    if (num_checked > num_players_allowed){
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
  game_not_started(){
    return get_current_game().inprogress;
  },
  current_game_code(){
    return get_current_game().code;
  },
  current_turn(){
    return get_current_game().currentTurn
  },
  turn_instructions(){
    var game = get_current_game()
    if (game == undefined){
      return;
    }
    var player = game.players.find(x => x.playerID === Meteor.userId());
    var leader = game.players.find(x => x.role === 'leader');
    var current_turn = game.turnRecords.find(x => x.turn_number == game.currentTurn);
    //returns instructions based on role
    if (game.pass_fail_round == true){
      //if user is selected
      var proposal = current_turn.votes.find(x => x.role === 'leader');
      var user = Meteor.users.findOne({_id : Meteor.userId()});
      if (proposal.proposal.includes(user.username)){
        return 'You have been selected to venture outside the ship to repair the reactors.';
      }
      //if user isnt selected
      else{
        var proposal = current_turn.votes.find(x => x.role === 'leader');
        var user = Meteor.users.findOne({_id : Meteor.userId()});
        return "waiting for " + proposal.proposal.join(' and ') + " to attempt repair on the ship";
      }
    }
    switch (player.role){
      case 'voter':
        return 'vote on ' + leader.username +"'"+"s proposal";
      case 'leader':
        if (already_voted()){
          return "wait for everyone else to vote on your proposal";
        }
        return 'decide which players you want to propose for your group';
      default:
        return 'you should never see this.';
    }
  },
  voters(){
    return get_current_game().players.filter(x => x.role === 'voter');
  },
  leader(){
    return get_current_game().players.find(x => x.role === 'leader');
  },
  current_players(){
    //checks if user is in game, if so, finds game, parses array into array of usernames
    return get_player_list({leader_highlight : true}).players;
  },
  pending_votes(playerID){
    //returns the vote if player has voted this round, else false
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
    return Games.findOne({owner: Meteor.userId()}) != null
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
    var game = Games.findOne({code: gamecode})
    if (game.players.length < 5){
      Session.set('alert_modal_content', "There are less than 5 players. Game won't start.")
      $('#alert_modal').modal('show');

    }
    //fade('beginGame');
    Meteor.call('interface.beginGame', gamecode, Meteor.userId());
  },
  'click .advance-turn'(event, target){
    var gamecode = event.target.value;
    Meteor.call('interface.advanceTurn', gamecode, Meteor.userId());
  },
  'click .show_modal'(event) {
    event.preventDefault();
    $('#end_game_modal').modal('show');
  },
  'click .end-game'(event, target){
    var gamecode = event.target.value;
    //hide backdrop
    $('#end_game_modal').modal('hide');
    $('body').removeClass('modal-open');
    $('.modal-backdrop').remove();
    Meteor.call('interface.endGame', gamecode, Meteor.userId());
  }

})



Template.pass_fail_round_vote.helpers({
  is_evil(){
    var game = get_current_game();
    var player = game.players.find(x => x.playerID === Meteor.userId());
    console.log(player.secretRole)
    return (player.secretRole == 'evil' ) ? true : false;
  },
  has_voted_pass_fail(){
    var game = get_current_game();
    var current_turn = game.turnRecords.find(x => x.turn_number === game.currentTurn);
    //console.log(current_turn.pass_fail_votes.find(x => x.playerID == Meteor.userId()));
    if (game.currentTurn == 0){
      return false;
    }
    if (current_turn.pass_fail_votes.find(x => x.playerID == Meteor.userId()) == undefined){
      //hasn't voted
      return false;
    }
    else{
      //has voted
      return true;
    }
  }
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
    to_return['inprogress'] = game.inprogress;
    if (game.inprogress == false){
      to_return['waiting_message'] = 'The roles are undecided, we are waiting for the game to start.';
    }
    if (game.inprogress == true){
      var player = game.players.find(x => x.playerID === Meteor.userId());
      to_return['player_role'] = player.secretRole;
      if (player.secretRole == 'evil' ||
          player.secretRole == 'merlin'){
        to_return['evil_players'] = game.players.filter(x => x.secretRole === 'evil');
      }
    }
    return to_return;
  }
  //send note???
})

Template.game_score.helpers({
  current_score(){
    var game = get_current_game();
    if (game.inprogress == false){
      return;
    }
    var game_score = game.currentScore.display;
    var rules = game_rules_template[game.players.length];
    var display = [];
    for (i = 0; i < 5; i++){
      var circle = {};
      circle['num_players_round'] = rules.players_per_turn[i]
      if (i <= game_score.length){
        switch (game_score[i]){
          case 'good':
            circle['color'] = 'green'
            break;
          case 'evil':
            circle['color'] = 'red'
            break;
          default:
            circle['color'] = 'grey'
            break;
        }
      }
      else{
        circle['color'] = 'grey'
      }
      display.push(circle);
    }
    return display;
  },
  num_evil_players(){
    game = get_current_game();
    if (game.inprogress == false){
      return;
    }
    return game_rules_template[game.players.length].num_evil_players;
  }
})


Template.alert_modal.helpers({
  alert_modal_body(){
    return Session.get('alert_modal_content');
  }
})

Template.game_over_screen.helpers({
  winner(){
    var game = get_current_game();
    if (game.gameOver == true){
      return game.winner;
    }
    else{
      return false;
    }
  }

})

Template.waiting_for_players.helpers({
  player_list(){
    return get_player_list();
  }
})

Template.screen_overlay.helpers({
  screen_overlay_message(){
    return Session.get('screen_overlay_message');
  }
})
