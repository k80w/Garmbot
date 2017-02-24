const debug = require("debug")("garmbot:module:math"),
	Discord = require("discord.js");

module.exports = function(garmbot) {
	garmbot.addCommand(["round"], async function(message, args) {
		let options = args.trim();
		let embed = new Discord.RichEmbed()
			.setTitle("Rounded Number")
			.setDescription(Math.round(options))
		return message.channel.sendEmbed(embed, message.author.toString());
	});
	garmbot.addCommand(["powerof"], async function(message, args) {
		let options = args.trim();
		let embed = new Discord.RichEmbed()
			.setTitle("Power Of")
			.setDescription(Math.pow(options[0], options[1]));
		return message.channel.sendEmbed(embed, message.author.toString());
	});
	garmbot.addCommand(["sqrt"], async function (message, args) {
		let options = args.trim();
		let embed = new Discord.RichEmbed()
			.setTitle("Square Root")
			.setDescription(Math.sqrt(options[0]));
		return message.channel.sendEmbed(embed, message.author.toString());
	});
	garmbot.addCommand(["sine"], async function (message, args) {
		let options = args.trim();
		let embed = new Discord.RichEmbed()
			.setTitle("Sine")
			.setDescription(Math.sin(options[0]));
		return message.channel.sendEmbed(embed, message.author.toString());
	});
	garmbot.addCommand(["cosine"], async function (message, args) {
		let options = args.trim();
		let embed = new Discord.RichEmbed()
			.setTitle("Cosine")
			.setDescription(Math.cos(options[0]));
		return message.channel.sendEmbed(embed, message.author.toString());
	});
	garmbot.addCommand(["random"], async function (message, args) {
		let options = args.trim();
		let embed = new Discord.RichEmbed();
		if (options[0] == undefined) {
			embed
				.setTitle("Random Number Generator")
				.setDescription(String(Math.random()).slice(2));
			return message.channel.sendEmbed(embed, message.author.toString());
		} else if (options[0] != undefined || options[1] != undefined) {
			embed
				.setTitle("Random Number Generator")
				.setDescription(String(Math.random(options[0], options[1])).slice(2));
			return message.channel.sendEmbed(embed, message.author.toString());
		}
	});
}