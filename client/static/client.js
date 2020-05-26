const pageData = {
    examples: [
        new Example("example-1", "Single line item", EXAMPLE_PRESCRIPTION_SINGLE_LINE_ITEM),
        new Example("example-2", "Multiple line items", EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS)
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
        resetPageData()
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

rivets.formatters.isSign = function (mode) {
    return mode === "sign"
}

rivets.formatters.isVerify = function (mode) {
    return mode === "verify"
}

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

function sendRequest() {
    const xhr = new XMLHttpRequest()

    xhr.onload = handleResponse
    xhr.onerror = handleError
    xhr.ontimeout = handleTimeout

    xhr.open("POST", "/" + pageData.mode)
    xhr.setRequestHeader("Content-Type", "application/json")

    const payload = JSON.stringify(getPayload())
    if (pageData.mode === "sign") {
        const signRequest = {
            "payload": btoa(payload)
        }
        xhr.send(JSON.stringify(signRequest))
    } else {
        const verifyRequest = {
            "payload": btoa(payload),
            "signature": pageData.signature
        }
        xhr.send(JSON.stringify(verifyRequest))
    }
}

function handleResponse() {
    pageData.signResponse = {
        statusCode: this.status,
        statusText: this.statusText,
        body: this.responseText
    }
}

function handleError() {
    addError("Network error")
}

function handleTimeout() {
    addError("Network timeout")
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
    const prescribingOrganization = organizations.filter(organization => "urn:uuid:" + organization.id === encounter.serviceProvider.reference)[0]
    const parentOrganization = organizations.filter(organization => "urn:uuid:" + organization.id === prescribingOrganization.partOf.reference)[0]
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

function resetPageData() {
    pageData.signRequestSummary = getSummary(getPayload())
    pageData.signResponse = null
    pageData.errorList = null
}

function bind() {
    rivets.bind(document.querySelector('#main-content'), pageData)
}