const Garmbot = require("./garmbot");

let garmbot = new Garmbot();
garmbot.start();
/**
DELETE THIS
-----------
**/
garmbot.addCommand(["error"], async function(message, args) { throw new Error("yeeeep"); });
