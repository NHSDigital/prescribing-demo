/**
 * Models
 */
const epsModelsUrl = "https://raw.githubusercontent.com/NHSDigital/electronic-prescription-service-api/master/models/examples"

function getBundleExample(path) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open("GET", `${epsModelsUrl}/${path}`, false);
  xmlHttp.send(null);
  const bundle = JSON.parse(xmlHttp.responseText);
  return bundle;
}

/**
 * Examples
 */
let REPEAT_DISPENSING = getBundleExample("example-1-repeat-dispensing/SendRequest-FhirMessageSigned.json")
let ACUTE_NOMINATED_PHARMACY = getBundleExample("example-2-acute-nominated-pharmacy/SendRequest-FhirMessageSigned.json")
