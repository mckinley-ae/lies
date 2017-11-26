import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

export const Games = new Mongo.Collection('games')


if (Meteor.isServer) {
  // This code only runs on the server
  Meteor.publish('games', function tasksPublication() {
    return Games.find();
    //some sort of handling here
  });

}

Meteor.methods({
  'interface.newGame'(user){
    //create new code
    //TODO - random words replace code
    function makeid() {
      var text = "";
      var possible = "abcdefghijklmnopqrstuvwxyz0123456789";
      for (var i = 0; i < 4; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
      return text;
    }
    //check if user is in game?

    //redo how player order is handled
    // players should be an object
    // turn order should be decided seperately in another field

    //create first turn
    var firstTurn = {
      //leader

      //
    }

    //create game
    gamecode = makeid()
    Games.insert({
      type: 'game',
      createdAt: new Date(),
      code : gamecode,
      owner : Meteor.userId(),
      players : [],
      playerOrder : [],
      acceptingnewplayers : true,
      inprogress: 'false',
      archived: 'false',
      currentTurn : 0,
      turnRecords: [],
      currentScore : {'good' : 0, 'evil' : 0}
    })
    //add creator to game as a user
    Meteor.call('interface.joinGame',gamecode, Meteor.userId())
    //reassign interface
  },
  'interface.joinGame'(gamecode, userID){
    //see if player is any other game
    if (Games.find({players: {$elemMatch: { playerID:userID }}}).count() == 0){
      //also needs to check if game is still accepting new players and isnt archived
      user = Meteor.users.findOne({_id : userID});
      Games.update(
        {code : gamecode},
        {$addToSet:
          { players: {
            'playerID' : userID,
            'username' : user.username,
            'role' : ''
        }}})
    }
    else{
      console.log('player already exists in game');
    }
  },
  'interface.beginGame'(gamecode, userID){
    //stop new players joining
    //update everything
    //begin game
    //could use some validation
    game = Games.findOne({code : gamecode});
    //doesn't start unless there are 5 or more players
    if (game.players.length < 5){
      console.log("there are less than 5 players. Game won't start.");
      return;
    }
    // assign random roles
    var players = game.players;
    var r = Math.floor(Math.random() * players.length);
    for (i=0; i<game.players.length; i++){
      var role = 'voter';
      if (i == r){ role = 'leader' }
      players[i].role = role;
    }
    //update DB
    Meteor.call('interface.advanceTurn',gamecode, Meteor.userId())
    Games.update(
      {code : gamecode},
      {$set : {
          acceptingnewplayers : false,
          inprogress : true,
          players : players
        }
      }
    );
  },
  'interface.advanceTurn'(gamecode, userID){
    var game = Games.findOne({code : gamecode});
    //could use some validation

    //only works if everyone has voted

    //updates score

    //chooses next roles
    var players = game.players;
    var new_leader_index = undefined;
    var old_leader_index = undefined;
    for (i=0; i<game.players.length; i++){
      if (players[i].role == 'leader'){
        console.log('yes');
        new_leader_index = (i + 1) % game.players.length;
        console.log(new_leader_index)
        old_leader_index = i;
      }
    }
    players[old_leader_index].role = 'voter';
    players[new_leader_index].role = 'leader';
    //updates db
    var new_turn_number = game.currentTurn + 1
    Games.update(
      {code : gamecode},
      {
        $set : {
          currentTurn: new_turn_number,
          players : players
        },
        $push: {
          turnRecords : {
            turn_number : new_turn_number,
            winner : '',
            votes : []
           }
        }
      }
    );
  },
  'interface.shufflePlayers'(gamecode, userID){
      //could use some validation
      var player_list = [];
      // loop through player list
//      for (var player in game.players){
//        player_list.push(player.username);
//      }
//      shuffle_players = function(array){
        // brute force DO NOT USE  long arrays / todo: make cooler/faster
//        var new_array = [];
//        while (new_array.length < array.length  ){
//          //randum number between 0 and length of player array
//          var random_index = Math.floor(Math.random() * array.length);
//          if (!new_array.includes(array[random_index])){
//            new_array.push(array[random_index]);
//          }
//        };
//        return new_array
//      };
      game = Games.findOne({code : gamecode});
      Games.update(
       {code : gamecode},
         {$set :
          { playerOrder : shuffle_players(player_list) }
        }
      );
  },
  'action.submitParty'(array, gamecode){
    //validate
    Meteor.call('addValueToTurnRecords', gamecode, array);
 },
 'addValueToTurnRecords'(gamecode, value){
  var game = Games.findOne({code : gamecode});
  var player = game.players.find(x => x.playerID === Meteor.userId());
  var current_turn_num = game.currentTurn
  //    var current_turn = game.turnRecords.find(x => x.turn_number == game.currentTurn);
  //    var current_turn.votes[player.username] = {
  var current_turn = game.turnRecords.find(x => x.turn_number === game.currentTurn);
  //console.log(current_turn.votes.find(x => x.playerID === Meteor.userId()));
  if (current_turn.votes.find(x => x.playerID === Meteor.userId()) !== undefined){
    //looks to see if vote from player is already in votes, doesn't write to db;
    console.log('you cannot change your vote.')
    return;
  }
  //console.log((current_turn.votes.find(x => x.playerID === Meteor.userId()))
  var player_vote = {
   'role' : player.role,
   'playerID' : player.playerID,
   'username' : player.username
  }
  if (player.role == 'leader'){
   player_vote['proposal'] = value;
  }
  else{
   player_vote['vote'] = value;
  }
  Games.update(
    {code : gamecode, "turnRecords.turn_number" : current_turn_num},
    {$push: {  "turnRecords.$.votes" : player_vote } }
  );
 }

});
