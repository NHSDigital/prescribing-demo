const pageData = {
    examples: [
        new Example("example-1", "Repeat Dispensing", REPEAT_DISPENSING),
        // todo: cater for multiple example use-case (needs selected example tracked through redirects)
        //new Example("example-2", "Acute Nominated Pharmacy", ACUTE_NOMINATED_PHARMACY)
    ],
    mode: "sign",
    signature: "",
    loggedIn: Cookies.get("Access-Token-Set") === "true"
}

function Example(id, description, message) {
    this.id = id
    this.description = description
    this.message = message
    this.select = function () {
        pageData.selectedExampleId = id
        resetPageData(pageData.mode)
    }
}

rivets.formatters.snomedCode = function(codings) {
    return codings.filter(coding => coding.system === "http://snomed.info/sct")[0].code
}

rivets.formatters.snomedCodeDescription = function(codings) {
    return codings.filter(coding => coding.system === "http://snomed.info/sct")[0].display
}

rivets.formatters.nhsNumber = function(identifiers) {
    const nhsNumber = identifiers.filter(identifier => identifier.system === "https://fhir.nhs.uk/Id/nhs-number")[0].value;
    return nhsNumber.substring(0, 3) + " " + nhsNumber.substring(3, 6) + " " + nhsNumber.substring(6)
}

rivets.formatters.odsCode = function(identifiers) {
    return identifiers.filter(identifier => identifier.system === "https://fhir.nhs.uk/Id/ods-organization-code")[0].value
}

rivets.formatters.titleCase = function(string) {
    //TODO length checks
    return string.substring(0, 1).toUpperCase() + string.substring(1)
}

rivets.formatters.fullName = function(name) {
    return concatenateIfPresent([
        toUpperCaseIfPresent(name.family),
        name.given,
        surroundWithParenthesesIfPresent(name.prefix),
        surroundWithParenthesesIfPresent(name.suffix)
    ])
}

rivets.formatters.fullAddress = function(address) {
    return concatenateIfPresent([
        address.line,
        address.city,
        address.district,
        address.state,
        address.postalCode,
        address.country
    ])
}

rivets.formatters.isSign = (mode) => mode === 'sign'

rivets.formatters.isVerify = (mode) => mode === 'verify'

rivets.formatters.isSend = (mode) => mode === 'send'

rivets.formatters.joinWithSpaces = function(strings) {
    return strings.join(" ")
}

rivets.formatters.appendPageMode = function (string) {
    return string + pageData.mode
}

function concatenateIfPresent(fields) {
    return fields.filter(field => field).reduce((currentValues, valuesToAdd) => currentValues.concat(valuesToAdd), [])
}

function surroundWithParenthesesIfPresent(fields) {
    if (fields) {
        return fields.map(field => "(" + field + ")")
    } else {
        return fields
    }
}

function toUpperCaseIfPresent(field) {
    if (field) {
        return field.toUpperCase()
    } else {
        return field
    }
}
 
async function sendSignRequest() {
    try {
        const payload = JSON.stringify(getPayload())

        const response = await fetch("/sign", {
            method: "POST",
            body: payload,
            headers: {
                'Content-Type': 'application/json'
            }
        })

        const payloadResponse = await response.json()
        window.location.href = `${payloadResponse.redirectUri}&callbackurl=${payloadResponse.callbackUri}`
    } catch(e) {
        console.log(e)
        addError('Communication error')
    }
}

async function sendVerifyRequest() {
    try {
        const payload = JSON.stringify(getPayload())

        const response = await fetch("/verify", {
            method: "POST",
            body: JSON.stringify({ 'payload': btoa(payload), 'signature': pageData.signature }),
            headers: {
                'Content-Type': 'application/json'
            }
        })

        pageData.signResponse = {}
        pageData.signResponse.signature = JSON.stringify(await response.json())
    } catch(e) {
        console.log(e)
        addError('Communication error')
    }
}

async function sendPrescriptionRequest() {
    try {
        const bundle = getPayload()

        updateBundleSignature(bundle)

        const response = await fetch("/send", {
            method: "POST",
            body: JSON.stringify(bundle),
            headers: {
                'Content-Type': 'application/json'
            }
        })

        const sendResponse = await response.json()

        pageData.sendResponse = {}
        pageData.sendResponse.statusCode = sendResponse.status_code
    } catch(e) {
        console.log(e)
        addError('Communication error')
    }
}

function updateBundleSignature(bundle) {
    const provenanceIndex =
        bundle.entry
            .map(entry => entry.resource)
            .flatMap(resource => resource.resourceType)
            .indexOf("Provenance");

    const provenance = bundle["entry"][provenanceIndex]

    provenance.resource.signature[0].data = pageData.signResponse.signature
}

window.onerror = function(msg, url, line, col, error) {
    addError("Unhandled error: " + msg + " at " + url + ":" + line + " col " + col);
    return true;
}

function addError(message) {
    console.log(message)
    if (pageData.errorList === null) {
        pageData.errorList = []
    }
    pageData.errorList.push({
        message: message
    })
}

function getSummary(payload) {
    const patient = getResourcesOfType(payload, "Patient")[0]
    const practitioner = getResourcesOfType(payload, "Practitioner")[0]
    const encounter = getResourcesOfType(payload, "Encounter")[0]
    const organizations = getResourcesOfType(payload, "Organization")
    const prescribingOrganization = organizations[0]
    const parentOrganization = organizations[1]
    const medicationRequests = getResourcesOfType(payload, "MedicationRequest")
    return {
        patient: patient,
        practitioner: practitioner,
        encounter: encounter,
        prescribingOrganization: prescribingOrganization,
        parentOrganization: parentOrganization,
        medicationRequests: medicationRequests
    }
}

function getPayload() {
    return pageData.examples.filter(example => example.id === pageData.selectedExampleId)[0].message
}

function getResourcesOfType(prescriptionBundle, resourceType) {
    const resources = prescriptionBundle.entry.map(entry => entry.resource)
    return resources.filter(resource => resource.resourceType === resourceType);
}

function onLoad() {
    pageData.examples[0].select()
    bind()
}

function resetPageData(pageMode = '') {
    pageData.mode = pageMode
    pageData.signRequestSummary = getSummary(getPayload())
    pageData.sendResponse = null
    pageData.errorList = null
}

function resetSignResponse() {
    pageData.signResponse = null
}

function bind() {
    rivets.bind(document.querySelector('#main-content'), pageData)
}