const debug = require("debug")("garmbot:module:help"),
	Discord = require("discord.js");

module.exports = function(garmbot) {
	garmbot.addCommand(["help", "h"], async function(message, args) {
		debug("Sending help!");
		return message.reply("https://dnaf.github.io/Garmbot/Commands");
	});
}