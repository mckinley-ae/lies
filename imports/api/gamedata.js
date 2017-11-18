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

    //create game
    gamecode = makeid()
    Games.insert({
      type: 'game',
      createdAt: new Date(),
      code : gamecode,
      owner : Meteor.userId(),
      players : [],
      acceptingnewplayers : true,
      inprogress: 'false',
      archived: 'false',
      currentTurn : 0,
      turnRecords: [
        {}, {}, {}, {}, {}
      ],
      currentScore : {'good' : 0, 'evil' : 0}
    })
    //add creator to game as a user
    Meteor.call('interface.joinGame',gamecode, Meteor.userId())
    //reassign interface
  },
  'interface.joinGame'(gamecode, userID){
    user = Meteor.users.findOne({_id : userID});
    Games.update(
      {code : gamecode},
      {$addToSet:
        { players: {
          'playerID' : userID,
          'username' : user.username
          }
        }
      }
    )
  },
  'interface.beginGame'(gamecode, userID){
    //stop new players joining
    //update everything
    //begin game
    //could use some validation
    console.log(gamecode, userID)
    Games.update(
      {code : gamecode},
      {$set :
        { currentTurn: 1 ,
          acceptingnewplayers : false,
          inprogress : true
        }
      }
    );
  },
  'interface.advanceTurn'(gamecode, userID){
        //could use some validation
    var lastTurn = Games.findOne({code : gamecode}).currentTurn;
    console.log('last turn : ' + lastTurn);
    Games.update(
      {code : gamecode},
      {$set :
        { currentTurn: lastTurn + 1 }
      }
    );

  },
  'interface.prompt_turn_leader_action'(gamecode){

  },
  'interface.prompt_user_vote'(gamecode){

  },
  'interface.shufflePlayers'(gamecode, userID){
      //could use some validation
      shuffle_players = function(array){
        // brute force DO NOT USE for long arrays / todo: make cooler/faster
        var new_array = []
        while (new_array.length < array.length  ){
          //randum number between 0 and length of player array
          var random_index = Math.floor(Math.random() * array.length);
          if (!new_array.includes(array[random_index])){
            new_array.push(array[random_index]);
          }
        };
        return new_array
      };
      game = Games.findOne({code : gamecode});
      Games.update(
       {code : gamecode},
         {$set :
          { players : shuffle_players(game.players) }
        }
      );
  },
  'action.submitParty'(array, gamecode){
    console.log(array, gamecode)
    game = Games.findOne({code : gamecode});
    currentTurn = game.currentTurn;
    currentTurnRecord = game.turnRecords;
    currentTurnRecord = game.turnRecords[currentTurn];
    currentTurnRecord['MeteorId'] = array;
    currentTurnRecord[currentTurn] = currentTurnRecord
    Games.update(
     {code : gamecode},
       {$set :
        { turnRecords : currentTurnRecord  }
      }
    );
  }
});
