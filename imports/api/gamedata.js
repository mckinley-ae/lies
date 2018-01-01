import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

//game data
export const Games = new Mongo.Collection('games');

//client-side triggers for animation
export const Triggers = new Mongo.Collection('triggers');


export const game_rules_template = {
  '5' : {'num_evil_players' : 2, '4th_turn' : false,
    'players_per_turn' : [2, 3, 2, 3, 3]
    },
  '6' : {'num_evil_players' : 2, '4th_turn' : false,
    'players_per_turn' : [2, 3, 4, 3, 4]
    },
  '7' : {'num_evil_players' : 2, '4th_turn' : true,
    'players_per_turn' : [2, 3, 3, 4, 4]
    },
  '8' : {'num_evil_players' : 3, '4th_turn' : true,
    'players_per_turn' : [3, 4, 4, 5, 5]
    },
  '9' : {'num_evil_players' : 3, '4th_turn' : true,
    'players_per_turn' : [3, 4, 4, 5, 5]
    },
  '10' : {'num_evil_players' : 4, '4th_turn' : true,
    'players_per_turn' : [3, 4, 4, 5, 5]
    },
}

if (Meteor.isServer) {
  // This code only runs on the server
  Meteor.publish('games', function tasksPublication() {
    return Games.find();
  });
  Meteor.publish('triggers', function tasksPublication() {
    return Triggers.find();
  });


}
