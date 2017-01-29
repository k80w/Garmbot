Promise = require("bluebird");

const config = require("config"),
	debug = require("debug")("garmbot:plugin:plotly"),
	plotly = require("plotly");

module.exports = function(garmbot) {
	if (config.get("plotly.token").length > 0 && config.get("plotly.username").length > 0) {
		let plots = {};

		let connection = plotly(config.get("plotly.username"), config.get("plotly.token"));

		plotter = async () => {
			let channels = config.get("plotly.channels");
			for (let i = 0; i < channels.length; i++) {
				debug("Plotting message activity for channel %s", channels[i]);
				let channel = garmbot.channels.get(channels[i]);

				let date = new Date();
				let datestring = date.getUTCFullYear() + "-" + (date.getUTCMonth() + 1) + "-" + (date.getUTCDate() + 1) + " " + (date.getUTCHours() + 1) + ":" + date.getUTCMinutes() + ":" + date.getUTCSeconds();
				let count = await garmbot.getRecentMessagesInChannel(channel, 120);

				let data = [{
					x: [new Date()],
					y: [count],
					type: "scatter"
				}];
				let graphOptions = {
					filename: "garmbot-" + channels[i] + "-messageActivity",
					fileopt: "extend"
				};

				debug("Sending data to plotly");
				await new Promise((resolve, reject) => {
					connection.plot(data, graphOptions, (err, res) => {
						if (err) {
							return reject(err);
						} else {
							return resolve(res);
						}
					});
				});
			}
		}

		garmbot.on("ready", () => {
			plotter();
			setInterval(plotter, 120000);
		});
	}
}