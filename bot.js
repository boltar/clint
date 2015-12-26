/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
          ______     ______     ______   __  __     __     ______
          /\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
          \ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
          \ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
           \/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/


This is a sample Slack bot built with Botkit.

This bot demonstrates many of the core features of Botkit:

* Connect to Slack using the real time API
* Receive messages based on "spoken" patterns
* Reply to messages
* Use the conversation system to ask questions
* Use the built in storage system to store and retrieve information
  for a user.

# RUN THE BOT:

  Get a Bot token from Slack:

    -> http://my.slack.com/services/new/bot

  Run your bot from the command line:

    token=<MY TOKEN> node bot.js

# USE THE BOT:

  Find your bot inside Slack to send it a direct message.

  Say: "Hello"

  The bot will reply "Hello!"

  Say: "who are you?"

  The bot will tell you its name, where it running, and for how long.

  Say: "Call me <nickname>"

  Tell the bot your nickname. Now you are friends.

  Say: "who am I?"

  The bot will tell you your nickname, if it knows one for you.

  Say: "shutdown"

  The bot will ask if you are sure, and then shut itself down.

  Make sure to invite your bot into other channels using /invite @<my bot>!

# EXTEND THE BOT:

  Botkit is has many features for building cool and useful bots!

  Read all about it here:

    -> http://howdy.ai/botkit

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


var Botkit = require('./lib/Botkit.js')
var os = require('os');
var moment = require('moment-timezone')

var controller = Botkit.slackbot({
  debug: false,
  json_file_store: 'storage'
});

var bot = controller.spawn(
  {
    token:process.env.token
  }
).startRTM();

// create a db of users

bot.api.users.list({}, function(err,response) {
  for (i in response.members) {
    name = response.members[i].name;
    console.log("members: " + response.members[i].name);
    
    function getName(pname) { // need to make this a function for closure
      controller.storage.users.get(pname, function(err,user) {
        if (!user) {
          user = {
            id: pname,
            regs: [ ]
          } 
          controller.storage.users.save(user, function(err,id) {
            console.log("saved file for " + user.id);
          })
        }
      })
    }
    getName(name);
  }
})

controller.hears(['hello','hi'],'direct_message,direct_mention,mention',function(bot,message) {

  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  },function(err,res) {
    if (err) {
      bot.botkit.log("Failed to add emoji reaction :(",err);
    }
  });


  controller.storage.users.get(message.user,function(err,user) {
    if (user && user.name) {
      bot.reply(message,"Hello " + user.name+"!!");
    } else {
      bot.reply(message,"Hello.");
    }
  });
})

controller.hears(['call me (.*)'],'direct_message,direct_mention,mention',function(bot,message) {
  var matches = message.text.match(/call me (.*)/i);
  var name = matches[1];
  controller.storage.users.get(message.user,function(err,user) {
    if (!user) {
      user = {
        id: message.user,
      }
    }
    user.name = name;
    controller.storage.users.save(user,function(err,id) {
      bot.reply(message,"Got it. I will call you " + user.name + " from now on.");
    })
  })
});

// [\w]+ doesn't work for some reason... 
controller.hears(['(.+\.regint) (.*)'],'direct_message,direct_mention,mention',function(bot,message) {
  console.log("heard regint")
  var matches = message.text.match(/(.+\.regint) (.*)/i);
  if (matches == null) {
    return;
  }
  var name = matches[1].substring(0, matches[1].length - ".regint".length);
  var text = matches[2];
  console.log("registering for " + name + " " + text);
  controller.storage.users.get(name,function(err,user) {
    if (!user) {
      bot.reply(message,"User '" + name + "' does not exist!");
      return;
    } else if (user.regs) {
      user.regs.push({description: text, timestamp: JSON.stringify(moment())});
    }
    controller.storage.users.save(user,function(err,id) {
      bot.reply(message,"Registering interrupt '" + text + "'" + " for " + name);
    })
  })
});

controller.hears(['.+\.showint'],'direct_message,direct_mention,mention',function(bot,message) {
  console.log("heard showint")
  var matches = message.text.match(/.+\.showint/i);
  if (matches == null) {
    return;
  }
  var name = matches[0].substring(0, matches[0].length - ".showint".length);
  console.log("showing ints for " + name);
  controller.storage.users.get(name,function(err,user) {
    if (!user) {
      bot.reply(message,"User '" + name + "' does not exist!");
      return;
    } else if (user.regs && user.regs.length > 0) {
      var regList = "registered interrupts: \n";
      for (i in user.regs) {
        m = moment(JSON.parse(user.regs[i].timestamp)).tz('America/New_York')
        regList += m.format("YYYY-MM-DD h:mm A") + " - " + user.regs[i].description + "\n";
        //regList += m + " - " + user.regs[i].description + "\n";
      }
      bot.reply(message, regList);
    } else {
      bot.reply(message, "no registered interrupts");
    }
    })
});

controller.hears(['.+\.clearall'],'direct_message,direct_mention,mention',function(bot,message) {
  console.log("heard clearall")
  var matches = message.text.match(/.+\.clearall/i);
  if (matches == null) {
    return;
  }
  console.log(matches)
  var name = matches[0].substring(0, matches[0].length - ".clearall".length);
  console.log("clearing all int for " + name);
  controller.storage.users.get(name,function(err,user) {
    if (!user) {
      bot.reply(message,"User '" + name + "' does not exist!");
      return;
    } else {
      user.regs = [ ];
    }
    controller.storage.users.save(user,function(err,id) {
      bot.reply(message,"Clearing all interrupts for " + name);
    })
  })
});

controller.hears(['(.+\.clearint) (.*)'],'direct_message,direct_mention,mention',function(bot,message) {
  console.log("heard clearint")
  var matches = message.text.match(/(.+\.clearint) *(.*)/i);
  if (matches == null) {
    return;
  }
  console.log(matches)
  var name = matches[1].substring(0, matches[1].length - ".clearint".length);
  var text = matches[2];
  console.log("clearing int for " + name + ", " + text);
  controller.storage.users.get(name,function(err,user) {
    if (!user) {
      bot.reply(message,"User '" + name + "' does not exist!");
      return;
    } else if (user.regs) {
      var regs = user.regs;
      console.log(regs);
      for (i in regs)
      {
        if (regs[i] === text) {
          regs.splice(i, 1);
          // user.regs = regs.join();
          console.log("i: " + i)
          console.log("user.regs: " + user.regs)
          controller.storage.users.save(user,function(err,id) {
            bot.reply(message,"Clearing interrupt '" + text + "' for " + name);
          })
          return;
        }
      }
    } else {
      bot.reply(message,"interrupt '" + text + "' not found.");
    }
  })
});

controller.hears(['help'],'direct_message,direct_mention,mention',function(bot,message) {
  console.log("help");
  bot.reply(message,"`<username>.showint` show all interrupts");
  bot.reply(message,"`<username>.regint <interrupt description>` register an interrupt");
  bot.reply(message,"`<username>.clearint <interrupt description>` clear one interrupt");
  bot.reply(message,"`<username>.clearall` clear all interrupts");
});

controller.hears(['what is my name','who am i'],'direct_message,direct_mention,mention',function(bot,message) {

  controller.storage.users.get(message.user,function(err,user) {
    if (user && user.name) {
      bot.reply(message,"Your name is: " + user.name);
    } else {
      bot.reply(message,"I don't know yet!");
    }
  })
});


controller.hears(['shutdown'],'direct_message,direct_mention,mention',function(bot,message) {

  bot.startConversation(message,function(err,convo) {
    convo.ask("Are you sure you want me to shutdown?",[
      {
        pattern: bot.utterances.yes,
        callback: function(response,convo) {
          convo.say("Bye!");
          convo.next();
          setTimeout(function() {
            process.exit();
          },3000);
        }
      },
      {
        pattern: bot.utterances.no,
        default:true,
        callback: function(response,convo) {
          convo.say("*Phew!*");
          convo.next();
        }
      }
    ])
  })
})


controller.hears(['uptime','identify yourself','who are you','what is your name'],'direct_message,direct_mention,mention',function(bot,message) {

  var hostname = os.hostname();
  var uptime = formatUptime(process.uptime());

  bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name +'>. I have been running for ' + uptime + ' on ' + hostname + ".");

})

function formatUptime(uptime) {
  var unit = 'second';
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'minute';
  }
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'hour';
  }
  if (uptime != 1) {
    unit = unit +'s';
  }

  uptime = uptime.toFixed(2) + ' ' + unit;
  return uptime;
}
