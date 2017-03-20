const debug = require("debug")("garmbot:module:help");

module.exports = function(garmbot) {
	garmbot.addCommand(["help", "h"], async function(message) {
		debug("Sending help!");
		return message.reply("https://dnaf.github.io/Garmbot/Commands");
	});
};