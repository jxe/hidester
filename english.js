// english.js

function conjoin(components){
  if (components.length == 0) return "";
  if (components.length == 1) return components[0];
  if (components.length == 2) return components[0] + " and " + components[1];
  return components.slice(0,-1).join(', ') + ", and " + components[components.length - 1];
}

