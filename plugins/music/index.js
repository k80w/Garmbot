const debug = require("debug")("garmbot:module:music"),
	util = require("util"),
	youtubeUrl = require("youtube-url"),
	ytdl = require("ytdl-core");

async function play(connection, queue) {
	let url = queue.shift();
	if (url) {
		debug("Attempting to play URL %s", url);
		let stream = ytdl(url, {
			"filter": "audioonly"
		});
		debug("Created stream %s", util.inspect(stream));
		let dispatcher = await connection.playStream(stream, {
			seek: 0,
			volume: 1,
			passes: 1
		});
		connection.playing = true;
		debug("Stream playing");
		dispatcher.on("end", () => {
			debug("Stream ended");
			connection.playing = false;
			return play(connection, queue);
		});
	}
}

module.exports = function(garmbot) {
	let servers = {};

	garmbot.addCommand(["play", "queue", "q"], async function(message, args) {
		if (message.guild) {
			if (message.member.voiceChannel) {
				debug("Received queue command in %s", message.guild);
				servers[message.guild.id] = servers[message.guild.id] || {
					"queue": [],
					"connection": false
				};

				if (!servers[message.guild.id].connection) {
					debug("Connecting to voice channel %s", message.member.voiceChannel);
					servers[message.guild.id].connection = message.member.voiceChannel.join();
				}

				let {connection, queue} = servers[message.guild.id];
				await connection;

				let url;
				if (youtubeUrl.valid(args)) { // Is it a URL?
					debug("Request was a valid youtube URL");
					url = args.trim();
				} else {
					debug("Request was a search query");
					return message.reply("Video searching isn't implemented");
				}

				debug("Pushing request onto queue");
				queue.push(url);
				if (!(await connection).playing) { // Is something already playing?
					debug("Nothing's playing; lets play our new music!");
					await play(await connection, queue);
				}
				return message.reply("Added to queue!");
			} else {
				return message.reply("You can only use that command while in a voice channel.");
			}
		} else {
			return message.reply("You can't play music in DMs fam :sunglasses: :ok_hand:")
		}
	});

	return servers
}