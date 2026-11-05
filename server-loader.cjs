require("@babel/register")({
  presets: [require.resolve("@babel/preset-env")],
});
require("./server.js");
