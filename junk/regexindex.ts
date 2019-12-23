var pattern = /\d+\.?\d*|\.\d+/;
var match = pattern.exec("the number is 7.5!");

var start = match.index;
var text = match[0];
var end = start + text.length;