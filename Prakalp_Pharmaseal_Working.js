const geid = id => document.getElementById(id);
const toTop = () => window.scrollTo({ top: 0, behavior: 'instant' });
const jumpGap = (el, edge, gap) => {
    if (!el) return;
    if (!edge) edge = 'top';
    if (!gap) gap = 5;
    const r = el.getBoundingClientRect();
    const top = edge === 'top' ? r.top + window.scrollY - gap : r.bottom + window.scrollY - document.documentElement.clientHeight + gap;
    window.scrollTo({ top, behavior: 'instant' });
};
const pad2 = n => String(n).padStart(2, '0');
const esc = s => String(s).replace(/[&<>"']/g, c => ESCAPES[c]);
const span = (cls, text) => `<span class = '${cls}'>${esc(text)}</span>`;
const stg1 = s => span('stg1', s);
const stg2 = s => span('stg2', s);
const fld1 = s => span('fld1', s);
const fld2 = s => span('fld2', s);
const dt1 = d => span('dt1', formatCustomDate(d));
const dt2 = d => span('dt2', formatCustomDate(d));
const fv1 = (label, d) => `${fld1(label)} (${dt1(d)})`;
const fv2 = (label, d) => `${fld2(label)} (${dt2(d)})`;
const pid = s => span('pid', s);
const hasLetter = s => /[A-Za-z]/.test(s);
const normalizeText = a => String(a ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
const fail = (errorMsg, whathappened = 'is Tampered') => ({ errorMsg, whathappened });
const sameText = (a, b) => normalizeText(a) === normalizeText(b);
const date_input_stage = stage => stage === 'Manufacturer' ? ['Manufacturing_Date_of_Medicine', 'Expiry_Date_of_Medicine', 'Added_to_Database'] : ['DateTime_Received', 'Added_to_Database'];
const dateParseOptions = field => ({ dateOnlyEndOfDay: field === 'Expiry_Date_of_Medicine', utcDateOnly: field !== 'Added_to_Database' });
const isValidDate = d => d instanceof Date && !Number.isNaN(d.getTime());
const validDateOrNull = d => isValidDate(d) ? d : null;
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const serverNowStamp = () => firebase.firestore.FieldValue.serverTimestamp();
const formatCustomDate = d => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const parseQty = s => {
    if (!/^(\d+(\.\d+)?|\.\d+)$/.test(s)) return null;
    const [whole = '', frac = ''] = s.split('.');
    if (whole.replace(/^0+/, '').length > 11) return null;
    const qty = Number(`${whole || '0'}.${frac.slice(0, 4) || '0'}`);
    return qty > 0 ? qty : null;
};
const getTrimmed = inputs => inputs.map(input => input.value.trim());
const partyFields = (S, mgrLabel, [nameHint, locHint, mgrHint, emailHint]) => {
    const s = S.toLowerCase();
    return [
        [`${S}_Name`, `${s}_name`, `${S} Name`, 'text', nameHint],
        [`${S}_Location`, `${s}_loc`, `${S} Location`, 'text', locHint],
        [`${S}_Manager`, 'responsible_name', `${S} ${mgrLabel} Name`, 'text', mgrHint],
        ['Manager_Email', 'responsible_email', `${S} ${mgrLabel} Email ID`, 'email', emailHint]
    ];
};
const renderQRCode = text => (QRCodehtml.innerHTML = '', new QRCode(QRCodehtml, { text, width: 406, height: 406 }));
const generatePackId = () => `SIH-PK-${randomDigits(13)}`;
const appendtransfer = (packid, current_stage) => current_stage === 'Customer' ? verifyResult.innerHTML += `\n\n\n<span class = 'good'>This medicine has already reached the Customer.</span> <span class = 'cs'>No further transfers allowed.</span>` : buildTransferForm(packid, current_stage);
const bindToggle = (btn, section, label) => btn.onclick = () => {
    const showing = section.style.display === 'block';
    section.style.display = showing ? 'none' : 'block';
    btn.textContent = `${showing ? 'Show' : 'Hide'} ${label}`;
};

function setVerifyResult(html = '') {
    verifyResult.innerHTML = html;
    verifyResult.style.display = html ? 'block' : 'none';
}
function randomDigits(length) {
    const limit = 0xFFFFFFFF - (0x100000000 % 10);
    const digits = [];
    const buffer = new Uint32Array(length);
    while (digits.length < length) {
        crypto.getRandomValues(buffer);
        for (const v of buffer) if (digits.length < length && v <= limit) digits.push(v % 10);
    }
    return digits.join('');
}
function createSaveGuard() {
    let busy = false, seq = 0;
    return {
        isBusy: () => busy,
        async run(save, onSaved, onFailed) {
            if (busy) return;
            busy = true;
            const mySeq = ++seq;
            const timer = setTimeout(() => { busy = false; alert(savetimeout); }, timeoutm);
            try { await save(); }
            catch (error) { onFailed(error); return; }
            finally { clearTimeout(timer); if (mySeq === seq) busy = false; }
            try { await onSaved(); }
            catch (error) { console.error(error); }
        }
    };
}
function buildLocalDate(y, mo, d, h = 0, mi = 0, s = 0) {
    const dt = new Date(y, mo - 1, d, h, mi, s, 0);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d || dt.getHours() !== h || dt.getMinutes() !== mi || dt.getSeconds() !== s) return null;
    return dt;
}
function parseDateTimeInput(value, { dateOnlyEndOfDay = false } = {}) {
    if (value instanceof Date) return isValidDate(value) ? new Date(value.getTime()) : null;
    if (typeof value !== 'string') return null;
    const str = value.trim();
    if (!str) return null;
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}.*(Z|[+-]\d{2}:?\d{2})$/i.test(str)) return validDateOrNull(new Date(str.replace(' ', 'T')));
    const m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:(?:\s+at\s+|[T\s])(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?)?$/i);
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (m[4] === undefined) return dateOnlyEndOfDay ? buildLocalDate(y, mo, d, 23, 59, 59) : buildLocalDate(y, mo, d);
    return buildLocalDate(y, mo, d, +m[4], +m[5], +(m[6] || 0));
}
function mustParseDate(value) {
    const d = parseDateTimeInput(value);
    if (!d) throw new Error(`Invalid date: ${value}`);
    return d;
}
function toDateString(value) {
    const d = mustParseDate(value);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toDateTimestamp(value) {
    const d = mustParseDate(value);
    return firebase.firestore.Timestamp.fromMillis(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
}
function fromFirestoreDate(value, options) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object' && typeof value.toDate === 'function') {
        const d = validDateOrNull(value.toDate());
        return d && options?.utcDateOnly ? new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) : d;
    }
    if (value instanceof Date) return validDateOrNull(value);
    if (typeof value === 'object' && typeof value.seconds === 'number') return validDateOrNull(new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6)));
    if (typeof value === 'number' && Number.isFinite(value)) return validDateOrNull(new Date(value));
    if (typeof value === 'string') return parseDateTimeInput(value, options);
    return null;
}
function describeRawDate(raw) {
    if (raw === null || raw === undefined) return 'nothing stored';
    if (typeof raw === 'string') return raw.trim() === '' ? 'empty string' : `'${raw}'`;
    try { return JSON.stringify(raw); } catch { return String(raw); }
}
// Programmatic form.reset() also fires the 'reset' event, so handlers ignore it while this flag is on.
let muteReset = false;
const quietReset = form => { muteReset = true; form.reset(); muteReset = false; };

function closeCreate() {
    quietReset(createPackform);
    main_data_create.style.display = 'none';
    createPackform.style.display = 'none';
    createPackBtn.disabled = false;
}
function clearTransfer() {
    verifiedChain = null;
    transferownerform.onsubmit = null;
    transferownerform.innerHTML = '';
    transferownerform.style.display = 'none';
    transferOwnerBtn.innerHTML = '';
    transferOwnerBtn.style.display = 'none';
    transferOwnerBtn.disabled = false;
}
function closeVerify() {
    verifySeq++;
    quietReset(scanverifyform);
    setVerifyResult();
    clearTransfer();
    scanverifyform.style.display = 'none';
    scanVerifyBtn.disabled = false;
}
function openCreate() {
    closeVerify();
    createPackBtn.disabled = true;
    createPackform.style.display = 'block';
    jumpGap(sl, 'bottom');
    NameInput.focus();
}
function openVerify() {
    closeCreate();
    transferownerform.style.display = 'none';
    transferOwnerBtn.disabled = false;
    scanVerifyBtn.disabled = true;
    scanverifyform.style.display = 'block';
    jumpGap(main_sec, null, 2);
    verifyIdInput.focus();
}
function openTransfer() {
    scanverifyform.style.display = 'none';
    scanVerifyBtn.disabled = false;
    transferOwnerBtn.disabled = true;
    transferownerform.style.display = 'block';
    jumpGap(transferownerform.querySelector('label[for$="_loc"]'), 'bottom', 2);
    transferownerform.querySelector('[id$="_batch"]')?.focus();
}
async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return false; }
}

const firebase = window.firebase;
const firebase_initialization_config = {
    apiKey: 'AIzaSyDY453ohxvPoizc0BUngVbqblVGAAfsX4Q',
    authDomain: 'mrindia-0.firebaseapp.com',
    databaseURL: 'https://mrindia-0-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'mrindia-0',
    storageBucket: 'mrindia-0.firebasestorage.app',
    messagingSenderId: '829263357469',
    appId: '1:829263357469:web:56e8ff92e299edee83c8f4',
    measurementId: 'G-DM9KX3VTTH'
}; firebase.initializeApp(firebase_initialization_config);
const database = firebase.firestore().collection('Smart_India_Hackathon_2025');

const stages = ['Manufacturer', 'Warehouse', 'Distributor', 'Retailer', 'Clinic', 'Customer'];
const receivedFields = Object.fromEntries(stages.slice(1).map((stage, i) => {
    const from = stages[i];
    return [stage, {
        name: `Name_of_Medicine_received_from_${from}`,
        license: `License_Number_received_from_${from}`,
        batch: `Batch_ID_of_Medicine_received_from_${from}`,
        quantity: `Quantity_Received_from_${from}`
    }];
}));
const receiptStorageLabel = 'Storage Condition at Receipt (e.g., temperature, humidity)';
const transferSteps = {
    Warehouse: {
        prefix: 'wh', qtyLabel: 'Quantity of Medicine Received from Manufacturer', qtyHint: 'e.g., 5000 strips',
        storageLabel: 'Storage Condition of Medicine (e.g., temperature, humidity)', storageHint: 'e.g., 2 - 8°C, 60% RH',
        party: partyFields('Warehouse', 'Manager', ['e.g., MedLife Central Storage', 'e.g., Bengaluru, Karnataka, India', 'e.g., Arjun Mehta', 'e.g., arjun.mehta@medlife.com'])
    },
    Distributor: {
        prefix: 'dbr', qtyLabel: 'Quantity Received', qtyHint: 'e.g., 500',
        storageLabel: receiptStorageLabel, storageHint: 'e.g., Temp 15 - 25°C, Humidity 55%',
        party: partyFields('Distributor', 'Responsible Person', ['e.g., MedLife Distributors Pvt Ltd', 'e.g., Mumbai, Maharashtra', 'e.g., Rahul Sharma', 'e.g., rahul.sharma@medlife.com'])
    },
    Retailer: {
        prefix: 'rtl', qtyLabel: 'Quantity Received', qtyHint: 'e.g., 200',
        storageLabel: receiptStorageLabel, storageHint: 'e.g., Temp 20 - 25°C, Humidity 50%',
        party: partyFields('Retailer', 'Responsible Person', ['e.g., Apollo Pharmacy', 'e.g., Connaught Place, New Delhi', 'e.g., Priya Verma', 'e.g., priya.verma@apollo.com'])
    },
    Clinic: {
        prefix: 'cln', qtyLabel: 'Quantity Received', qtyHint: 'e.g., 120',
        storageLabel: receiptStorageLabel, storageHint: 'e.g., Temp 15 - 25°C, Humidity 55%',
        party: partyFields('Clinic', 'Responsible Person', ['e.g., City Health Clinic', 'e.g., Sector 22, Noida', 'e.g., Dr. Rakesh Mehta', 'e.g., rakesh.mehta@cityclinic.org'])
    },
    Customer: {
        prefix: 'cst', qtyLabel: 'Quantity Received', qtyHint: 'e.g., 2',
        party: [
            ['Customer_Name', 'customer_name', 'Customer Name', 'text', 'e.g., Ananya Sharma'],
            ['Customer_Email', 'customer_email', 'Customer Email ID', 'email', 'e.g., ananya.sharma@gmail.com']
        ]
    }
};
const requiredFields = {
    Manufacturer: [
        'Name_of_Medicine', 'Owning_Company', 'Medicine_Batch', 'Manufacturing_Date_of_Medicine',
        'Expiry_Date_of_Medicine', 'Quantity', 'Quantity_Unit', 'Location_of_Manufacturing_Plant', 'Plant_Manager',
        'Manager_Email', 'Company_Email', 'License_Number', 'Added_to_Database'
    ],
    ...Object.fromEntries(Object.entries(transferSteps).map(([stage, cfg]) => [stage, [
        receivedFields[stage].batch, receivedFields[stage].name, receivedFields[stage].license,
        ...cfg.party.map(([dbKey]) => dbKey),
        receivedFields[stage].quantity, 'Quantity_Unit', 'DateTime_Received',
        ...(cfg.storageLabel ? ['Storage_Condition'] : []),
        'Added_to_Database'
    ]]))
};
const matchChecks = [
    { label: 'Batch ID', mfrKey: 'Medicine_Batch', stageKey: s => receivedFields[s].batch, same: sameText },
    { label: 'Medicine Name', mfrKey: 'Name_of_Medicine', stageKey: s => receivedFields[s].name, same: sameText },
    { label: 'License Number', mfrKey: 'License_Number', stageKey: s => receivedFields[s].license, same: sameText },
    { label: 'Quantity', mfrKey: 'Quantity', stageKey: s => receivedFields[s].quantity, normalize: v => parseQty(String(v ?? '').trim()) ?? NaN, same: (a, b) => a === b },
    { label: 'Quantity Unit', mfrKey: 'Quantity_Unit', stageKey: () => 'Quantity_Unit', same: sameText }
];

let verifiedChain = null;
let verifySeq = 0;

const timeoutm = 16000;
const savetimeout = 'Saving is taking too long. Please check your internet connection, then verify this Pack ID again to see whether it was saved before retrying.';
const textletter = 'All Text Fields (Names, Batch, License, Unit, Address, Email, Storage Condition, etc.) must contain atleast One Letter. Numbers or Symbols ALONE are NOT Allowed.';
const qtyvalidvalue = 'Quantity must be a number greater than zero (e.g. 10 or 2.5).';

const guards = { create: createSaveGuard(), transfer: createSaveGuard() };
const QRCodehtml = geid('qrcode');
const createPackform = geid('createPack');
const scanverifyform = geid('scan_verify');
const transferownerform = geid('transfer_owner');
const infosec = geid('info_sec');
const websitecreatorinfo = document.querySelector('footer');
const main_data_create = geid('main_data_create');
const lastPackIdInput = geid('PackId');
const verifyIdInput = geid('verifyID');
const verifyResult = geid('verifyResult');
const NameInput = geid('m_name');
const ManufacturerInput = geid('m_manufacturer');
const BatchInput = geid('m_batch');
const ManInput = geid('m_man');
const ExpInput = geid('m_exp');
const QtyInput = geid('m_qty');
const QtyUnitInput = geid('m_qty_unit');
const locationInput = geid('m_location');
const ManagerNameInput = geid('m_manager_name');
const ManagerEmailInput = geid('m_manager_email');
const CompanyEmailInput = geid('m_company_email');
const LicenseInput = geid('m_license');
const createPackBtn = geid('createPackBtn');
const scanVerifyBtn = geid('scanVerifyBtn');
const transferOwnerBtn = geid('transferOwnerBtn');
const infoBtn = geid('infoBtn');
const websitecreatorbtn = geid('about-the-creator-btn');
const main_sec = geid('main_btns');
const sl = document.querySelector('label[for="m_manager_email"]');
const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

bindToggle(infoBtn, infosec, 'Website Information'), bindToggle(websitecreatorbtn, websitecreatorinfo, 'About the Creator');
createPackBtn.onclick = openCreate;
scanVerifyBtn.onclick = openVerify;
transferOwnerBtn.onclick = openTransfer;
createPackform.onsubmit = createPack;
scanverifyform.onsubmit = verifyPack;
createPackform.onreset = () => {
    if (muteReset) return;
    setTimeout(() => {
        jumpGap(sl, 'bottom');
        NameInput.focus();
    });
};
scanverifyform.onreset = () => {
    if (muteReset) return;
    verifySeq++;
    clearTransfer();
    setTimeout(() => {
        setVerifyResult();
        jumpGap(main_sec, null, 2);
        verifyIdInput.focus();
    });
};
transferownerform.onreset = () => {
    if (muteReset) return;
    setTimeout(() => {
        jumpGap(transferownerform.querySelector('label[for$="_loc"]'), 'bottom', 2);
        transferownerform.querySelector('[id$="_batch"]')?.focus();
    });
};
function analyzeChain(data, presentStages) {
    for (let i = 0; i < presentStages.length; i++) if (stages[i] !== presentStages[i]) return fail(`<span class = 'bad'>Missing</span> Stage : ${stg1(stages[i])}. This Indicates Medicine has been <span class = 'bad'>Tampered</span>!`, "exists but its <span class = 'bad'>supply chain is broken</span>");
    for (const stage of presentStages) {
        if (!data[stage]) return fail(`<span class = 'bad'>Missing</span> Data for Stage ${stg1(stage)}`);
        for (const field of requiredFields[stage]) if (!(field in data[stage])) return fail(`<span class = 'bad'>Missing Required Data Field</span> ${fld1(field)} in Stage ${stg1(stage)}`);
    }
    const mfr = data.Manufacturer;
    for (const stage of presentStages.slice(1)) {
        for (const { label, mfrKey, stageKey, normalize = v => v, same } of matchChecks) {
            const raw = data[stage][stageKey(stage)];
            if (raw === undefined) continue;
            const stageValue = normalize(raw);
            if (!same(stageValue, normalize(mfr[mfrKey]))) return fail(`<span class = 'cs'>${label}</span> at ${stg1(stage)} (${fld1(stageValue)}) <span class = 'bad'>Does NOT Match</span> the ${stg2('Manufacturer')} <span class = 'cs'>${label}</span> on record`);
        }
    }
    const parsed = {};
    for (const stage of presentStages) {
        parsed[stage] = {};
        for (const field of date_input_stage(stage)) {
            const raw = data[stage][field];
            const parsedDate = fromFirestoreDate(raw, dateParseOptions(field));
            if (!parsedDate) return fail(`Date field ${fld1(field)} in stage ${stg1(stage)} is <span class = 'bad'>empty, missing or invalid</span> (${esc(describeRawDate(raw))})`);
            parsed[stage][field] = startOfDay(parsedDate);
        }
    }
    const today = startOfDay(new Date());
    const man = parsed.Manufacturer.Manufacturing_Date_of_Medicine;
    const exp = parsed.Manufacturer.Expiry_Date_of_Medicine;
    if (man > exp) return fail(`${fv1('Manufacturing Date', man)} <span class = 'bad'>is After</span> ${fv2('Expiry Date', exp)}`, "is <span class = 'bad'>Invalid</span>");
    if (man > today) return fail(`${fv1('Manufacturing Date', man)} is in the Future`);
    for (let i = 0; i < presentStages.length; i++) {
        const stage = presentStages[i];
        const added = parsed[stage].Added_to_Database;
        if (added > today) return fail(`${fv1('Added_to_Database', added)} at Stage ${stg1(stage)} is in the Future`);
        if (added < man) return fail(`${fv1('Added_to_Database', added)} at stage ${stg1(stage)}, \n<span class = 'bad'>is Before</span> ${fv2('Manufacturing Date', man)} of Medicine`);
        if (added > exp) return fail(`${fv1('Added_to_Database', added)} at Stage ${stg1(stage)}, \n<span class = 'bad'>is After</span> ${fv2('Expiry Date', exp)} of Medicine`, 'is Expired');
        if (i === 0) continue;
        const prevStage = presentStages[i - 1];
        const prevAdded = parsed[prevStage].Added_to_Database;
        const received = parsed[stage].DateTime_Received;
        const receivedAt = `${fv1('DateTime_Received', received)} at Stage ${stg1(stage)}`;
        if (received > today) return fail(`${receivedAt} is in the Future`);
        if (received < man) return fail(`${receivedAt}, \n<span class = 'bad'>is Before</span> ${fv2('Manufacturing Date', man)} of Medicine`);
        if (received > exp) return fail(`${receivedAt}, \n<span class = 'bad'>is After</span> ${fv2('Expiry Date', exp)}`, 'is Expired');
        if (received < prevAdded) return fail(`${receivedAt}, \n<span class = 'bad'>is Before</span> ${fv2('Added_to_Database', prevAdded)} of Previous Stage ${stg2(prevStage)}`);
        if (received > added) return fail(`${receivedAt}, \n<span class = 'bad'>is After</span> its Own ${fv2('Added_to_Database', added)}`);
        if (added < prevAdded) return fail(`${fv1('Added_to_Database', added)} of Stage ${stg1(stage)} <span class = 'bad'>is Before</span> ${fv2('Added_to_Database', prevAdded)} of previous stage ${stg2(prevStage)}`);
    }
    if (exp < today) return fail(`Medicine <span class = 'bad'>Expired</span>: ${fv1('Expiry Date', exp)} has already passed`, "is <span class = 'bad'>Expired</span>");
    return { parsed };
}
async function createPack(e) {
    e.preventDefault();
    if (guards.create.isBusy()) return;
    const man = parseDateTimeInput(ManInput.value);
    const exp = parseDateTimeInput(ExpInput.value);
    if (!man) return alert('Please enter a valid Manufacturing date.');
    if (!exp) return alert('Please enter a valid Expiry date.');
    const today = startOfDay(new Date());
    if (man > today) return alert('Manufacturing date cannot be in the future.');
    if (man > exp) return alert('Expiry date cannot be before the Manufacturing date.');
    if (exp < today) return alert('This medicine has already expired. Cannot register an expired medicine.');
    const qty = parseQty(QtyInput.value.trim());
    if (qty === null) return alert(qtyvalidvalue);
    const [name, manufacturer, batch, qtyUnit, location, managerName, managerEmail, companyEmail, license] = getTrimmed([NameInput, ManufacturerInput, BatchInput, QtyUnitInput, locationInput, ManagerNameInput, ManagerEmailInput, CompanyEmailInput, LicenseInput]);
    if (![name, manufacturer, batch, qtyUnit, location, managerName, managerEmail, companyEmail, license].every(hasLetter)) return alert(textletter);
    const packId = generatePackId();
    await guards.create.run(
        () => database.doc(packId).set({
            Manufacturer: {
                Name_of_Medicine: name,
                Owning_Company: manufacturer,
                Medicine_Batch: batch,
                Manufacturing_Date_of_Medicine: toDateTimestamp(man),
                Expiry_Date_of_Medicine: toDateTimestamp(exp),
                Quantity: qty,
                Quantity_Unit: qtyUnit,
                Location_of_Manufacturing_Plant: location,
                Plant_Manager: managerName,
                Manager_Email: managerEmail,
                Company_Email: companyEmail,
                License_Number: license,
                Added_to_Database: serverNowStamp()
            }
        }),
        async () => {
            lastPackIdInput.textContent = packId;
            try { renderQRCode(packId); }
            catch (error) {
                console.error(error);
                QRCodehtml.textContent = 'QR code could not be generated. Please use the Pack ID above.';
            }
            const copied = await copyText(packId);
            alert(`Pack created : ${packId}${copied ? ', and copied to clipboard' : ''}. \nPlease ${copied ? 'save' : 'copy and save'} this ID as it will be required for future verification and ownership transfers.`);
            closeCreate();
            toTop();
        },
        error => alert(`Error creating new medicine pack in database : ${error}`)
    );
}
async function verifyPack(e) {
    e.preventDefault();
    const seq = ++verifySeq;
    clearTransfer();
    jumpGap(main_sec, null, 2);
    verifyIdInput.focus();
    const id = verifyIdInput.value.trim();
    setVerifyResult('Verifying, Please Wait...');
    try {
        const doc = await database.doc(id).get();
        if (seq !== verifySeq) return;
        if (!doc.exists) return setVerifyResult(`No Records found for Pack ID ${pid(id)}. \nThis Indicates that the Pack ID or QR Code Printed over the Medicine is <span class = 'bad'>Invalid</span>, \nas it <span class = 'bad'>Does NOT Exist</span> in our Database.`);
        const data = doc.data({ serverTimestamps: 'estimate' });
        const presentStages = stages.filter(stage => data[stage]);
        if (presentStages.length === 0) return setVerifyResult(`Pack ID ${pid(id)} exists but no supply chain data found. It may be tampered.`);
        const { errorMsg, whathappened, parsed } = analyzeChain(data, presentStages);
        if (errorMsg) return setVerifyResult(`Pack ID ${pid(id)} <span class = 'bad'>${whathappened}</span>! \n${errorMsg}.\nOwnership <span class = 'bad'>Cannot be Transferred</span> further!`);
        const currentStage = presentStages[presentStages.length - 1];
        setVerifyResult(`Pack ID ${pid(id)} <span class = 'good'>Successfully Verified</span>! \nThis Pack is <span class = 'good'>Valid</span> and <span class = 'good'>Exists</span> in our database. \nCurrent Stage: <span class = 'cs'>${currentStage}</span>.`);
        verifiedChain = { parsed, lastStage: currentStage };
        appendtransfer(id, currentStage);
    } catch (error) {
        if (seq !== verifySeq) return;
        setVerifyResult(`An Error occurred while Verifying : <span class='bad'>${esc(error)}</span>. Please try again.`);
    } finally {
        if (seq === verifySeq) {
            jumpGap(main_sec, null, 2);
            (transferOwnerBtn.style.display === 'block' ? transferOwnerBtn : verifyIdInput).focus();
        }
    }
}
function checkReceivedDate(receivedDate) {
    if (!receivedDate) return 'Please enter a valid Date of Receiving.';
    const received = startOfDay(receivedDate);
    if (received > startOfDay(new Date())) return 'Date of Receiving cannot be in the future.';
    if (!verifiedChain) return '';
    const { parsed, lastStage } = verifiedChain;
    const man = parsed.Manufacturer.Manufacturing_Date_of_Medicine;
    const exp = parsed.Manufacturer.Expiry_Date_of_Medicine;
    const prevAdded = parsed[lastStage].Added_to_Database;
    if (received < man) return `Date of Receiving cannot be before the Manufacturing Date (${formatCustomDate(man)}).`;
    if (received > exp) return `Date of Receiving cannot be after the Expiry Date (${formatCustomDate(exp)}).`;
    if (received < prevAdded) return `Date of Receiving cannot be before the previous stage (${lastStage}) was added to the database (${formatCustomDate(prevAdded)}).`;
    return '';
}
function buildTransferForm(packid, fromStage) {
    const toStage = stages[stages.indexOf(fromStage) + 1];
    const cfg = transferSteps[toStage];
    if (!cfg) return;
    const p = cfg.prefix;
    const rf = receivedFields[toStage];
    const partyKeys = cfg.party.map(([, key]) => key);
    const textKeys = ['batch', 'med_name', 'license', 'qty_unit', ...partyKeys, ...(cfg.storageLabel ? ['storage_condition'] : [])];
    const field = (key, label, type, { hint = '', attrs = '' } = {}) => `<label for = '${p}_${key}'>${label} : </label>
    <input type = '${type}' id = '${p}_${key}' name = '${p}_${key}' ${hint ? `placeholder = '${hint}'` : ''} ${attrs} required>`;
    transferownerform.innerHTML = `
        <h2>Transfer Ownership: <span class = 'tx-from'>${fromStage}</span> → <span class = 'tx-to'>${toStage}</span></h2>
        ${field('pack', 'Pack ID', 'text', { attrs: `value = '${esc(packid)}' readonly` })}
        ${field('new_owner', 'New Owner Category', 'text', { attrs: `value = '${toStage}' readonly` })}
        ${field('batch', 'Batch of Medicine', 'text', { hint: 'e.g., B2025-001' })}
        ${field('med_name', 'Medicine Name', 'text', { hint: 'e.g., Paracetamol 500mg' })}
        ${field('license', 'Manufacturing License Number', 'text', { hint: 'e.g., A0024518' })}
        ${cfg.party.map(([, key, label, type, hint]) => field(key, label, type, { hint })).join('')}
        ${cfg.storageLabel ? field('storage_condition', cfg.storageLabel, 'text', { hint: cfg.storageHint }) : ''}
        ${field('qty_unit', 'Quantity Unit', 'text', { hint: 'e.g., strips, tablets, g' })}
        ${field('qty_received', cfg.qtyLabel, 'number', { hint: cfg.qtyHint, attrs: `min = '0' step = 'any'` })}
        ${field('received_time', 'Date of Receiving the Medicine', 'date', { attrs: `max = '${toDateString(new Date())}'` })}
        <button type = 'submit' style = 'font-weight: 700; font-size: 20px;'>Transfer Ownership</button>
        <button type = 'reset'  style = 'font-weight: 700; font-size: 20px;'>Reset Form</button>
    `;
    transferownerform.onsubmit = e => {
        e.preventDefault();
        const val = key => geid(`${p}_${key}`).value.trim();
        if (!textKeys.every(key => hasLetter(val(key)))) return alert(textletter);
        const qtyReceived = parseQty(val('qty_received'));
        if (qtyReceived === null) return alert(qtyvalidvalue);
        const receivedDate = parseDateTimeInput(val('received_time'));
        const dateError = checkReceivedDate(receivedDate);
        if (dateError) return alert(dateError);
        const party = Object.fromEntries(cfg.party.map(([dbKey, key]) => [dbKey, val(key)]));
        const ownerName = party[`${toStage}_Name`];
        const ownerLoc = party[`${toStage}_Location`];
        const record = {
            [rf.batch]: val('batch'),
            [rf.name]: val('med_name'),
            [rf.license]: val('license'),
            ...party,
            [rf.quantity]: qtyReceived,
            Quantity_Unit: val('qty_unit'),
            DateTime_Received: toDateTimestamp(receivedDate),
            ...(cfg.storageLabel ? { Storage_Condition: val('storage_condition') } : {}),
            Added_to_Database: serverNowStamp()
        };
        guards.transfer.run(
            () => database.doc(packid).set({ [toStage]: record }, { merge: true }),
            () => {
                alert(`Ownership of Pack ID ${packid} successfully transferred to ${toStage}: ${ownerLoc ? `${ownerName}, ${ownerLoc}` : ownerName}`);
                quietReset(transferownerform);
                clearTransfer();
                quietReset(scanverifyform);
                setVerifyResult();
                scanverifyform.style.display = 'none';
                scanVerifyBtn.disabled = false;
                toTop();
            },
            error => alert(`Error transferring ownership to ${toStage} in database : ${error}`)
        );
    };
    transferOwnerBtn.innerHTML = `Transfer Ownership: <span class = 'tx-from'>${fromStage}</span> → <span class = 'tx-to'>${toStage}</span>`;
    transferOwnerBtn.disabled = false;
    transferOwnerBtn.style.display = 'block';
}