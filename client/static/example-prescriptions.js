let uuidNumber = 0
function deterministicNextUuid()
{
  uuidNumber++
  const uuidNumberStr = uuidNumber.toString(16)
  const uuidNumberStrPadded = uuidNumberStr.padStart(32, "0")
  return uuidNumberStrPadded.substring(0, 8) + "-"
      + uuidNumberStrPadded.substring(8, 12) + "-"
      + uuidNumberStrPadded.substring(12, 16) + "-"
      + uuidNumberStrPadded.substring(16, 20) + "-"
      + uuidNumberStrPadded.substring(20, 32)
}

function CodeAndDesc(code, desc) {
  this.code = code
  this.desc = desc
}

function Coding(system, code, display) {
  this.system = system
  this.code = code
  this.display = display
}

function Identifier(system, value) {
  this.system = system
  this.value = value
}

function Telecom(system, value, use) {
  this.system = system
  this.value = value
  this.use = use
}

function Address(use, type, lines, city, postalCode) {
  this.use = use
  this.type = type
  this.line = lines
  this.city = city
  this.postalcode = postalCode
}

function Name(use, family, given, prefix, suffix) {
  this.use = use
  this.family = family
  this.given = given
  this.prefix = prefix
  this.suffix = suffix
}

function Quantity(value, unitCode) {
  this.value = value
  this.unit = unitCode.desc
  this.system = "http://snomed.info/sct"
  this.code = unitCode.code
}

function Entry(resource) {
  this.resource = resource
  this.fullUrl = "urn:uuid:" + this.resource.id
}

/**
 * Resources
 */

function Organization(odsCode, type, name) {
  this.resourceType = "Organization"
  this.id = deterministicNextUuid()
  this.identifier = [
      new Identifier("https://fhir.nhs.uk/Id/ods-organization-code", odsCode)
  ]
  this.type = [
    {
      coding: new Coding("urn:oid:2.16.840.1.113883.2.1.3.2.4.17.94", type.code, type.desc)
    }
  ]
  this.name = name
}
Organization.prototype.addTelecom = function (telecom) {
  if (!this.telecom) {
    this.telecom = []
  }
  this.telecom.push(telecom)
}
Organization.prototype.addAddress = function (address) {
  if (!this.address) {
    this.address = []
  }
  this.address.push(address)
}
Organization.prototype.setParent = function (organization) {
  this.partOf = {
    reference: "urn:uuid:" + organization.id
  }
}

function Encounter(organization) {
  this.resourceType = "Encounter"
  this.id = deterministicNextUuid()
  this.status = "finished"
  this.class = new Coding("http://terminology.hl7.org/CodeSystem/v3-ActCode", "AMB")
  this.serviceProvider = {
    reference: "urn:uuid:" + organization.id
  }
}

function Practitioner(sdsUserId, sdsJobRoleId, sdsRoleProfileId) {
  this.resourceType = "Practitioner"
  this.id = deterministicNextUuid()
  this.identifier = [
      new Identifier("https://fhir.nhs.uk/Id/sds-user-id", sdsUserId),
      new Identifier("https://fhir.nhs.uk/Id/sds-job-role-id", sdsJobRoleId),
      new Identifier("https://fhir.nhs.uk/Id/sds-role-profile-id", sdsRoleProfileId)
  ]
}
Practitioner.prototype.addName = function(name) {
  if (!this.name) {
    this.name = []
  }
  this.name.push(name)
}
Practitioner.prototype.addTelecom = function(telecom) {
  if (!this.telecom) {
    this.telecom = []
  }
  this.telecom.push(telecom)
}

function Patient(nhsNumber, gender, dateOfBirth) {
  this.resourceType = "Patient"
  this.id = deterministicNextUuid()
  this.identifier = [
      new Identifier("https://fhir.nhs.uk/Id/nhs-number", nhsNumber)
  ]
  this.gender = gender
  this.birthDate = dateOfBirth
}
Patient.prototype.addName = function (name) {
  if (!this.name) {
    this.name = []
  }
  this.name.push(name)
}
Patient.prototype.addAddress = function (address) {
  if (!this.address) {
    this.address = []
  }
  this.address.push(address)
}

function DosageInstruction(textualDose) {
  this.text = textualDose
}

function MedicationRequest(medicationCode, quantity, authoredOn) {
  this.resourceType = "MedicationRequest"
  this.id = deterministicNextUuid()
  this.status = "active"
  this.intent = "order"
  this.medicationCodeableConcept = {
    coding: [
        new Coding("http://snomed.info/sct", medicationCode.code, medicationCode.desc)
    ]
  }
  this.dispenseRequest = {
    quantity: quantity
  }
  this.authoredOn = authoredOn
}
MedicationRequest.prototype.addDosageInstruction = function(dosageInstruction) {
  if (!this.dosageInstruction) {
    this.dosageInstruction = []
  }
  this.dosageInstruction.push(dosageInstruction)
}
MedicationRequest.prototype.setPatient = function (patient) {
  this.subject = {
    reference: "urn:uuid:" + patient.id
  }
}
MedicationRequest.prototype.setEncounter = function (encounter) {
  this.encounter = {
    reference: "urn:uuid:" + encounter.id
  }
}
MedicationRequest.prototype.setRequester = function (practitioner) {
  this.requester = {
    reference: "urn:uuid:" + practitioner.id
  }
}

function Bundle() {
  this.resourceType = "Bundle"
  this.id = deterministicNextUuid()
  this.type = "collection"
}
Bundle.prototype.addEntry = function (entry) {
  if (!this.entry) {
    this.entry = []
  }
  this.entry.push(entry)
}

/**
 * Codes
 */

const organizationTypeCodePct = new CodeAndDesc("005", "Primary Care Trust");
const organizationTypeCodeGp = new CodeAndDesc("001", "General Medical Practice");

const quantityCodeTablet = new CodeAndDesc("3319411000001109", "tablet")
const quantityCodeDose = new CodeAndDesc("4034511000001102", "dose")

/**
 * Examples
 */

const organization1b = new Organization(
    "1WQ",
    organizationTypeCodePct,
    "Manchester City"
)

const organization1a = new Organization(
    "M85022",
    organizationTypeCodeGp,
    "Signing_Surg_2"
)
organization1a.addTelecom(new Telecom("phone", "tel:0161867785", "work"))
organization1a.addAddress(new Address("work", "both", ["22 Dean Street"], "Manchester", "M1 4EF"))
organization1a.setParent(organization1b)

const encounter1 = new Encounter(organization1a)

const practitioner1 = new Practitioner("345747307432", "R0260", "125686540025")
practitioner1.addName(new Name("official", "Becond", null, ["Dr"]))
practitioner1.addTelecom(new Telecom("phone", "tel:0161867785", "work"))

const patient1 = new Patient("9900028562", "female", "1981-11-11")
patient1.addName(new Name("official", "Willow", ["Julie", "Lisa"], ["Miss"]))
patient1.addAddress(new Address("home", "both", ["2 Abagail street,"], "Manchester", "M12 2WS"))

const medicationRequest1 = new MedicationRequest(
    new CodeAndDesc("971711000001105", "Fluticasone 250micrograms/actuation inhaler CFC free 120 dose"),
    new Quantity(100, quantityCodeDose),
    "2008-02-21T14:22:00+00:00"
)
medicationRequest1.addDosageInstruction(new DosageInstruction("Inhale when needed"))
medicationRequest1.setPatient(patient1)
medicationRequest1.setEncounter(encounter1)
medicationRequest1.setRequester(practitioner1)

const EXAMPLE_PRESCRIPTION_SINGLE_LINE_ITEM = new Bundle()
EXAMPLE_PRESCRIPTION_SINGLE_LINE_ITEM.addEntry(new Entry(medicationRequest1))
EXAMPLE_PRESCRIPTION_SINGLE_LINE_ITEM.addEntry(new Entry(patient1))
EXAMPLE_PRESCRIPTION_SINGLE_LINE_ITEM.addEntry(new Entry(practitioner1))
EXAMPLE_PRESCRIPTION_SINGLE_LINE_ITEM.addEntry(new Entry(encounter1))
EXAMPLE_PRESCRIPTION_SINGLE_LINE_ITEM.addEntry(new Entry(organization1a))
EXAMPLE_PRESCRIPTION_SINGLE_LINE_ITEM.addEntry(new Entry(organization1b))

const organization2b = new Organization(
    "4CD",
    organizationTypeCodePct,
    "West Yorkshire"
)

const organization2a = new Organization(
    "M85011",
    organizationTypeCodeGp,
    "Signing_Surg_1"
)
organization2a.addTelecom(new Telecom("phone", "tel:01132754568", "work"))
organization2a.addAddress(new Address("work", "both", ["1 Princes Street"], "Leeds", "LS1 5AH"))
organization2a.setParent(organization2b)

const encounter2 = new Encounter(organization2a)

const practitioner2 = new Practitioner("125686540025", "R0260", "934565838956")
practitioner2.addName(new Name("official", "Hurst", null, ["Dr"]))
practitioner2.addTelecom(new Telecom("phone", "tel:011327534256", "work"))

const patient2 = new Patient("9900008464", "male", "1973-04-21")
patient2.addName(new Name("official", "Anderson", ["Michael", "Jack"], ["Mr"]))
patient2.addAddress(new Address("home", "both", ["1 Otley Road,"], "Leeds", "LS6 5RU"))

const medicationRequest2a = new MedicationRequest(
    new CodeAndDesc("317896006", "Digoxin 125 microgram oral tablet"),
    new Quantity(28, quantityCodeTablet),
    "2008-02-27T11:38:00+00:00"
)
medicationRequest2a.addDosageInstruction(new DosageInstruction("1 tablet after breakfast"))
medicationRequest2a.setPatient(patient2)
medicationRequest2a.setEncounter(encounter2)
medicationRequest2a.setRequester(practitioner2)

const medicationRequest2b = new MedicationRequest(
    new CodeAndDesc("319775004", "Aspirin 75 mg oral tablet"),
    new Quantity(28, quantityCodeTablet),
    "2008-02-27T11:38:00+00:00"
)
medicationRequest2b.addDosageInstruction(new DosageInstruction("1 tablet during breakfast"))
medicationRequest2b.setPatient(patient2)
medicationRequest2b.setEncounter(encounter2)
medicationRequest2b.setRequester(practitioner2)

const medicationRequest2c = new MedicationRequest(
    new CodeAndDesc("377145005", "Lorazepam 2 mg oral tablet"),
    new Quantity(84, quantityCodeTablet),
    "2008-02-27T11:38:00+00:00"
)
medicationRequest2c.addDosageInstruction(new DosageInstruction("3 tablets before breakfast"))
medicationRequest2c.setPatient(patient2)
medicationRequest2c.setEncounter(encounter2)
medicationRequest2c.setRequester(practitioner2)

const medicationRequest2d = new MedicationRequest(
    new CodeAndDesc("421375004", "Citalopram (as citalopram hydrobromide) 40 mg orodispersible tablet"),
    new Quantity(56, quantityCodeTablet),
    "2008-02-27T11:38:00+00:00"
)
medicationRequest2d.addDosageInstruction(new DosageInstruction("2 tablets after breakfast"))
medicationRequest2d.setPatient(patient2)
medicationRequest2d.setEncounter(encounter2)
medicationRequest2d.setRequester(practitioner2)

const EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS = new Bundle()
EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS.addEntry(new Entry(medicationRequest2a))
EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS.addEntry(new Entry(medicationRequest2b))
EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS.addEntry(new Entry(medicationRequest2c))
EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS.addEntry(new Entry(medicationRequest2d))
EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS.addEntry(new Entry(patient2))
EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS.addEntry(new Entry(practitioner2))
EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS.addEntry(new Entry(encounter2))
EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS.addEntry(new Entry(organization2a))
EXAMPLE_PRESCRIPTION_MULTIPLE_LINE_ITEMS.addEntry(new Entry(organization2b))
