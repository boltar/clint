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

var bot = controller.spawn({
  token: process.env.token
}).startRTM();

// create a db of users

bot.api.users.list({}, function(err, response) {
  var i
  for (i in response.members) {
    name = response.members[i].name;
    console.log("members: " + response.members[i].name);

    function getName(pname) { // need to make this a function for closure
      controller.storage.users.get(pname, function(err, user) {
        if (!user) {
          user = {
            id: pname,
            regs: []
          }
          controller.storage.users.save(user, function(err, id) {
            console.log("saved file for " + user.id);
          })
        }
      })
    }
    getName(name);
  }
})


controller.hears(['(\\w+)\.(regint|intreg|reg_int|int_reg) ([\\w: ]+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard regint")
  var matches = message.text.match(/(.+)\.(regint|intreg|reg_int|int_reg) ([\w: ]+)/i);
  if (matches == null) {
    return;
  }
  var name = matches[1]
  var text = matches[3]
  console.log("registering for " + name + " " + text);
  controller.storage.users.get(name, function(err, user) {
    if (!user) {
      bot.reply(message, "User '" + name + "' does not exist!");
      return;
    }
    else if (user.regs) {
      user.regs.push({
        description: text,
        timestamp: JSON.stringify(moment())
      });
    }
    controller.storage.users.save(user, function(err, id) {
      bot.reply(message, "Registering interrupt '" + text + "'" + " for " + name);
    })
  })
});

controller.hears(['(\\w+)\.(showint|intshow)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard showint")
  var matches = message.text.match(/(.+)\.(showint|intshow)/i);
  if (matches == null) {
    return;
  }
  // get the invoker's time zone
  bot.api.users.info({
    user: message.user
  }, function(err, response) {
    var timezone = response.user.tz;
    var name = matches[0].substring(0, matches[0].length - ".showint".length);
    console.log("showing ints for " + name);
    controller.storage.users.get(name, function(err, user) {
      if (!user) {
        bot.reply(message, "User '" + name + "' does not exist!");
        return;
      }
      else if (user.regs && user.regs.length > 0) {
        var regList = "registered interrupts: \n";
        var i
        for (i in user.regs) {
          m = moment(JSON.parse(user.regs[i].timestamp)).tz(timezone)
          regList += "`" + m.format("MM/DD/YYYY h:mm A") + " " + m.zoneName() + "`" + " - " + user.regs[i].description + "\n";
          //regList += m + " - " + user.regs[i].description + "\n";
        }
        bot.reply(message, regList);
      }
      else {
        bot.reply(message, "no registered interrupts");
      }
    }); // users.get
  }); // users.info
});

controller.hears(['.+\.clearall'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard clearall")
  var matches = message.text.match(/.+\.clearall/i);
  if (matches == null) {
    return;
  }
  console.log(matches)
  var name = matches[0].substring(0, matches[0].length - ".clearall".length);
  console.log("clearing all int for " + name);
  controller.storage.users.get(name, function(err, user) {
    if (!user) {
      bot.reply(message, "User '" + name + "' does not exist!");
      return;
    }
    else {
      user.regs = [];
    }
    controller.storage.users.save(user, function(err, id) {
      bot.reply(message, "Clearing all interrupts for " + name);
    })
  })
});

controller.hears(['(\\w+)\.(clearint|intclear) ([\\w:]+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard clearint")
  var matches = message.text.match(/(.+)\.(clearint|intclear) ([\w:]+)/i);
  if (matches == null) {
    return;
  }
  var name = matches[1]
  var text = matches[3]
  console.log("clearing int for " + name + ", " + text);
  controller.storage.users.get(name, function(err, user) {
    if (!user) {
      bot.reply(message, "User '" + name + "' does not exist!");
      return;
    }
    else if (user.regs) {
      var regs = user.regs;
      console.log(regs);
      var i
      for (i in regs) {
        if (regs[i].description === text) {
          regs.splice(i, 1);
          // user.regs = regs.join();
          console.log("i: " + i)
          console.log("user.regs: " + user.regs)
          controller.storage.users.save(user, function(err, id) {
            bot.reply(message, "Clearing interrupt '" + text + "' for " + name);
          })
          return;
        }
      }
    }
    else {
      bot.reply(message, "interrupt '" + text + "' not found.");
    }
  })
});

controller.hears(['help'], 'direct_message,direct_mention,mention', function(bot, message) {
  console.log("help");
  var help_text = "`<username>.showint` show all interrupts (intshow)\n" + 
    "`<username>.regint <interrupt description>` register an interrupt (reg_int, intreg, int_reg)\n" + 
    "`<username>.clearint <interrupt description>` clear one interrupt (clear_int, intclear, int_clear)\n" +
    "`<username>.clearall` clear all interrupts\n" + 
    "`------------------------------------------------------------------`\n" + 
    "`<username>.create <list name>` create a new list\n" +
    "`<username>.show_lists` display all lists\n" + 
    "`<username>.show <list name>` display contents of a list\n" + 
    "`<username>.del_list <list name> ` delete a list\n" + 
    "`<username>.del_item <list name> <item>` delete an item from a list (del, remove_item, remove)\n" + 
    "`<username>.add <list name> <item> ` add an item to a list"
    
    bot.reply(message, help_text)
});

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
    unit = unit + 's';
  }

  uptime = uptime.toFixed(2) + ' ' + unit;
  return uptime;
}

//------------------------
//generic list management
//------------------------
controller.hears(['(\\w+)\.create ([\\w:]+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard create")
  var matches = message.text.match(/(.+)\.create ([\w:]+)/i);
  if (matches == null) {
    return;
  }
  var name = matches[1]
  var text = matches[2]
  console.log("creating list " + text + " for " + name)
  controller.storage.users.get(name, function(err, user) {
    if (!user) {
      bot.reply(message, "User '" + name + "' does not exist!")
      return;
    }
    else if (user.lists) {
      user.lists.push({
        list_name: text,
        timestamp: JSON.stringify(moment()),
        list_items: []
      })
    }
    else {
      user.lists = [
        {
          list_name: text,
          timestamp: JSON.stringify(moment()),
          list_items: []
        }]
    }
    controller.storage.users.save(user, function(err, id) {
      bot.reply(message, "Created new list " + text + "" + " for " + name);
    })
  })
});

controller.hears(['(\\w+)\.(add|add_item) ([\\w:]+) (.+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard add")
  var matches = message.text.match(/(.+)\.(add|add_item) ([\w:]+) (.+)/i);
  if (matches == null) {
    return;
  }
  var name = matches[1]
  var list_name = matches[3]
  var list_item = matches[4]
  console.log("adding " + list_item + " in " + list_name + " for " + name);
  controller.storage.users.get(name, function(err, user) {
    if (!user) {
      bot.reply(message, "User '" + name + "' does not exist!")
      return;
    }
    else if (user.lists) {
      var i = get_list_index(user.lists, list_name)

      if (i != -1)
      {
        if (user.lists[i].list_items) {
          user.lists[i].list_items.push({
            item: list_item,
            timestamp: JSON.stringify(moment())
          })
          list_found = true;
        }
      } else {
        bot.reply(message, "List not found. Created list `" + list_name + "`")
        
        user.lists.push({
          list_name: list_name,
          timestamp: JSON.stringify(moment()),
          list_items: [{
            item: list_item,
            timestamp: JSON.stringify(moment())
          }]
        })
      }
    }

    controller.storage.users.save(user, function(err, id) {
      bot.reply(message, "Added `" + list_item + "`" + " for " + list_name)
    })
  })
})

controller.hears(['(\\w+)\.(del|del_item|remove|remove_item) ([\\w:]+) (.+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard del_item")
  var matches = message.text.match(/(.+)\.(del|del_item|remove|remove_item) ([\w:]+) (.+)/i);
  if (matches == null) {
    return;
  }
  var name = matches[1]
  var list_name = matches[3]
  var list_item = matches[4]
  console.log("attempting to delete " + list_item + " in " + list_name + " for " + name);
  controller.storage.users.get(name, function(err, user) {
    if (!user) {
      bot.reply(message, "User '" + name + "' does not exist!")
      return;
    }
    else if (user.lists) {
      var i = get_list_index(user.lists, list_name)

      if (i != -1)
      {
        var j = get_item_index(user.lists[i], list_item)
        if (j != -1) {
          user.lists[i].list_items.splice(j, 1)
          controller.storage.users.save(user, function(err, id) {
            bot.reply(message, "`" + list_item + "` deleted from " + list_name)
          })
        } else {
          bot.reply(message, "`" + list_item + "` does not exist in list " + list_name ) 
        }
      } else {
        bot.reply(message, "List " + list_name + " does not exist")
      }
    }

  })
})

function get_list_index(lists, list_name)
{
  var i
  for (i in lists)
  {
    if (lists[i].list_name === list_name)
    {
      return i
    }
  }
  return -1
}

function get_item_index(list, item_name)
{
  var i
  for (i in list.list_items)
  {
    if (list.list_items[i].item === item_name)
    {
      return i
    }
  }
  return -1
}

controller.hears(['(\\w+)\.show_lists$'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard show_lists")
  var matches = message.text.match(/(.+)\.show_lists$/i);
  if (matches == null) {
    return;
  }

  // get the invoker's time zone
  bot.api.users.info({
    user: message.user
  }, function(err, response) {
    var timezone = response.user.tz;
    var name = matches[1]
    console.log("showing lists for " + name);
    controller.storage.users.get(name, function(err, user) {
      if (!user) {
        bot.reply(message, "User '" + name + "' does not exist!");
        return;
      }
      else if (user.lists && user.lists.length > 0) {
        var str_lists = "Lists: \n";
        var i
        for (i in user.lists) {
          m = moment(JSON.parse(user.lists[i].timestamp)).tz(timezone)
          str_lists += "`" + m.format("MM/DD/YYYY h:mm A") + " " + m.zoneName() + "`" + " - " + user.lists[i].list_name + "\n";
        }
        bot.reply(message, str_lists);
      }
      else {
        bot.reply(message, "No lists to show");
      }
    }); // users.get
  }); // users.info
});

controller.hears(['(\\w+)\.show ([\\w:]+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard show list")
  var matches = message.text.match(/(.+)\.show ([\w:]+)/i);
  if (matches == null) {
    return;
  }
  
  var name = matches[1]
  var list_name = matches[2]
  // get the invoker's time zone
  bot.api.users.info({
    user: message.user
  }, function(err, response) {
    var timezone = response.user.tz;
    var name = matches[1]
    controller.storage.users.get(name, function(err, user) {
      if (!user) {
        bot.reply(message, "User '" + name + "' does not exist!");
        return;
      }
      else if (user.lists && user.lists.length > 0) {
        var str_lists = ""
        var i = get_list_index(user.lists, list_name)
        var j
        if (i != -1) {
          str_lists += list_name + "\n"
          for (j in user.lists[i].list_items) {
            m = moment(JSON.parse(user.lists[i].list_items[j].timestamp)).tz(timezone)
            str_lists += "`" + m.format("MM/DD/YYYY h:mm A") + " " + m.zoneName() + "`" + " - " + user.lists[i].list_items[j].item + "\n";
          }
          bot.reply(message, str_lists)
        }
      }
      else {
        bot.reply(message, "No lists to show");
      }
    }); // users.get
  }); // users.info
});

controller.hears(['(\\w+)\.del_list ([\\w:]+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard del_list")
  var matches = message.text.match(/(.+)\.del_list ([\w:]+)/i);
  if (matches == null) {
    return;
  }
  console.log(matches)
  var name = matches[1]
  var list_name = matches[2]
  console.log("deleting list for " + name + ", " + list_name);
  controller.storage.users.get(name, function(err, user) {
    if (!user) {
      bot.reply(message, "User '" + name + "' does not exist!");
      return;
    }
    else if (user.lists) {
      var lists = user.lists;
      console.log(lists);
      var i = get_list_index(lists, list_name)
      if (i != -1) {
          lists.splice(i, 1)
          controller.storage.users.save(user, function(err, id) {
            bot.reply(message, "Deleting list " + list_name + " for " + name);
          })
      } else {
        bot.reply(message, "List " + list_name + " not found.");
      }
    } else {
      bot.reply(message, "No lists found");
    }
  })
});

// --- STOCK MANAGEMENT, TO WORK WITH CHARLES
controller.hears(['(\\w+)\.quote ([\\w:]+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard quote")
  var matches = message.text.match(/(.+)\.quote ([\w:]+)/i);
  if (matches == null) {
    return;
  }
  
  var name = matches[1]
  var watch_list_name = matches[2]
  // get the invoker's time zone
  bot.api.users.info({
    user: message.user
  }, function(err, response) {
    var timezone = response.user.tz;
    var name = matches[1]
    controller.storage.users.get(name, function(err, user) {
      if (!user) {
        bot.reply(message, "User '" + name + "' does not exist!");
        return;
      }
      else if (user.lists && user.lists.length > 0) {
        var str_lists = ""
        var i = get_list_index(user.lists, watch_list_name)
        var j
        if (i != -1) {
          str_lists += "!q"
          for (j in user.lists[i].list_items) {
            m = moment(JSON.parse(user.lists[i].list_items[j].timestamp)).tz(timezone)
            str_lists += " " + user.lists[i].list_items[j].item;
          }
          bot.reply(message, str_lists)
        }
      }
      else {
        bot.reply(message, "No watchlist named " + watch_list_name);
      }
    }); // users.get
  }); // users.info
});

controller.hears(['(\\w+)\.stats ([\\w:]+)'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
  console.log("heard stats")
  var matches = message.text.match(/(.+)\.stats ([\w:]+)/i);
  if (matches == null) {
    return;
  }
  
  var name = matches[1]
  var watch_list_name = matches[2]
  // get the invoker's time zone
  bot.api.users.info({
    user: message.user
  }, function(err, response) {
    var timezone = response.user.tz;
    var name = matches[1]
    controller.storage.users.get(name, function(err, user) {
      if (!user) {
        bot.reply(message, "User '" + name + "' does not exist!");
        return;
      }
      else if (user.lists && user.lists.length > 0) {
        var str_lists = ""
        var i = get_list_index(user.lists, watch_list_name)
        var j
        if (i != -1) {
          str_lists += "!stats"
          for (j in user.lists[i].list_items) {
            m = moment(JSON.parse(user.lists[i].list_items[j].timestamp)).tz(timezone)
            str_lists += " " + user.lists[i].list_items[j].item;
          }
          bot.reply(message, str_lists)
        }
      }
      else {
        bot.reply(message, "No watchlist named " + watch_list_name);
      }
    }); // users.get
  }); // users.info
});

controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention', function(bot, message) {

  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  }, function(err, res) {
    if (err) {
      bot.botkit.log("Failed to add emoji reaction :(", err);
    }
  });


  controller.storage.users.get(message.user, function(err, user) {
    if (user && user.name) {
      bot.reply(message, "Hello " + user.name + "!!");
    }
    else {
      bot.reply(message, "Hello.");
    }
  });
});

controller.hears(['call me (.*)'], 'direct_message,direct_mention,mention', function(bot, message) {
  var matches = message.text.match(/call me (.*)/i);
  var name = matches[1];
  controller.storage.users.get(message.user, function(err, user) {
    if (!user) {
      user = {
        id: message.user,
      }
    }
    user.name = name;
    controller.storage.users.save(user, function(err, id) {
      bot.reply(message, "Got it. I will call you " + user.name + " from now on.");
    })
  })
});

controller.hears(['what is my name', 'who am i'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {

  controller.storage.users.get(message.user, function(err, user) {
    if (user && user.name) {
      bot.reply(message, "Your name is: " + user.name);
    }
    else {
      bot.reply(message, "I don't know yet!");
    }
  })
});


controller.hears(['shutdown'], 'direct_message,direct_mention,mention', function(bot, message) {

  bot.startConversation(message, function(err, convo) {
    convo.ask("Are you sure you want me to shutdown?", [{
      pattern: bot.utterances.yes,
      callback: function(response, convo) {
        convo.say("Bye!");
        convo.next();
        setTimeout(function() {
          process.exit();
        }, 3000);
      }
    }, {
      pattern: bot.utterances.no,
      default: true,
      callback: function(response, convo) {
        convo.say("*Phew!*");
        convo.next();
      }
    }])
  })
});


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name'], 'direct_message,direct_mention,mention', function(bot, message) {

  var hostname = os.hostname();
  var uptime = formatUptime(process.uptime());

  bot.reply(message, ':robot_face: I am a bot named <@' + bot.identity.name + '>. I have been running for ' + uptime + ' on ' + hostname + ".");

});

