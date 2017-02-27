const debug = require("debug")("garmbot:module:permissions"),
	Discord = require("discord.js");

module.exports = function(garmbot) {
	garmbot.addCommand(["cani"], async function(message, args) {
		let hasPermission = await garmbot.getUserPermission(message.author, message.guild, message.channel, args);

		if (hasPermission) {
			message.reply("Yep!");
		} else {
			message.reply("Nope");
		}
	});
}