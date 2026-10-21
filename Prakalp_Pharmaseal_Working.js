const geid = id => document.getElementById(id);
const pad2 = n => String(n).padStart(2, '0');
const hasLetter = s => /[A-Za-z]/.test(s);
const startOfDay = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const serverNowStamp = () => firebase.firestore.FieldValue.serverTimestamp();
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isValidDate = d => d instanceof Date && !Number.isNaN(d.getTime());
const validDateOrNull = d => isValidDate(d) ? d : null;
const dateParseOptions = field => ({ dateOnlyEndOfDay: field === 'Expiry_Date_of_Medicine', utcDateOnly: field !== 'Added_to_Database' });
const ctxt = (t, ctype = 'bad') => `<span class = '${ctype}'>${t}</span>`;
const noValue = () => `has ${ctxt('No Value')} (Null)`;
const emptyValue = () => `is ${ctxt('Empty')}`;
const wrongType = (expected, v) => `has ${ctxt('Wrong Data Type')} (Expected ${ctxt(expected, 'cs')}, Found ${ctxt(v == null ? 'Null' : Array.isArray(v) ? 'List' : typeof v === 'string' ? 'Text' : typeof v === 'number' ? 'Number' : typeof v === 'boolean' ? 'Boolean' : typeof v === 'object' ? 'Map' : 'Unknown')})`;
const invalidBecause = why => `is ${ctxt('Invalid')}: ${why}`;
const checkRecord = rec => rec == null ? noValue() : typeof rec !== 'object' || Array.isArray(rec) ? wrongType('Map', rec) : Object.keys(rec).length === 0 ? emptyValue() : '';
const checkDate = (v, field) => fromFirestoreDate(v, dateParseOptions(field)) ? '' : v == null ? noValue() : typeof v === 'string' && v.trim() === '' ? emptyValue() : typeof v === 'string' || typeof v === 'number' || v instanceof Date || (typeof v === 'object' && typeof v.toDate === 'function') ? invalidBecause('Not a Valid Date') : wrongType('Date', v);
const checkString = v => v == null ? noValue() : typeof v !== 'string' ? wrongType('Text', v) : v.trim() === '' ? emptyValue() : '';
const checkEmail = v => checkString(v) || (/^[^\s@]+@[^\s@]+$/.test(v.trim()) ? '' : invalidBecause('Not a Valid Email Format'));
const checkQty = v => v == null ? noValue() : typeof v !== 'number' ? wrongType('Number', v) : !Number.isFinite(v) ? invalidBecause('Not a Valid Number') : v <= 0 ? invalidBecause('Must be Greater than Zero') : parseQty(String(v)) === v ? '' : invalidBecause('Too Many Digits or Decimals');
const checkText = v => checkString(v) || (hasLetter(v) ? '' : invalidBecause('Contains No Letters'));
const txAnchor = () => transferownerform.querySelector('label[for$="_qty_unit"]');
const txFocus = () => transferownerform.querySelector('input:not([readonly])')?.focus();
const partyFields = (S, mgrLabel, [nameHint, locHint, mgrHint, emailHint]) => [
    [`${S}_Name`, `${S.toLowerCase()}_name`, `${S} Name`, 'text', nameHint],
    [`${S}_Location`, `${S.toLowerCase()}_loc`, `${S} Location`, 'text', locHint],
    [`${S}_Manager`, 'responsible_name', `${S} ${mgrLabel} Name`, 'text', mgrHint],
    ['Manager_Email', 'responsible_email', `${S} ${mgrLabel} Email ID`, 'email', emailHint]
];
const parseQty = s => {
    if (!/^(\d+(\.\d+)?|\.\d+)$/.test(s)) return null;
    const [whole = '', frac = ''] = s.split('.');
    if (whole.replace(/^0+/, '').length > 11) return null;
    const qty = Number(`${whole || '0'}.${frac.slice(0, 4) || '0'}`);
    return qty > 0 ? qty : null;
};
const dlName = (...parts) => {
    const d = new Date();
    return ['SIH2025 Prakalp Pharmaseal github_prajwal250', `${pad2(d.getDate())}_${pad2(d.getMonth() + 1)}_${d.getFullYear()} ${pad2(d.getHours() % 12 || 12)}_${pad2(d.getMinutes())}_${pad2(d.getSeconds())} ${d.getHours() < 12 ? 'am' : 'pm'}`, ...parts].join(' ');
};
const saveFile = (href, name) => {
    const a = document.createElement('a');
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
};
const downloadJson = (data, baseName) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    saveFile(url, `${baseName}.json`);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
const createSaveGuard = () => {
    let busy = false, seq = 0;
    return {
        isBusy: () => busy,
        async run(save, onSaved, onFailed) {
            if (busy) return;
            busy = true;
            const mySeq = ++seq;
            const timer = setTimeout(() => { busy = false; alert('Saving is Taking too long. Please Check your Internet Connection, then Verify this Pack ID again to see whether It was Saved before Retrying.'); }, 16000);
            try { await save(); }
            catch (error) { onFailed(error); return; }
            finally { clearTimeout(timer); if (mySeq === seq) busy = false; }
            try { await onSaved(); }
            catch (error) { console.error(error); }
        }
    };
};
const parseDateTimeInput = (value, { dateOnlyEndOfDay = false } = {}) => {
    const buildLocalDate = (y, mo, d, h = 0, mi = 0, s = 0) => {
        const dt = new Date(y, mo - 1, d, h, mi, s, 0);
        return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d && dt.getHours() === h && dt.getMinutes() === mi && dt.getSeconds() === s ? dt : null;
    };
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
};
const mustParseDate = value => {
    const d = parseDateTimeInput(value);
    if (!d) throw new Error(`Invalid date: ${value}`);
    return d;
};
const toDateTimestamp = value => {
    const d = mustParseDate(value);
    return firebase.firestore.Timestamp.fromMillis(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12));
};
const fromFirestoreDate = (value, options) => {
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
};
const jumpGap = (el, edge, gap = 5) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    window.scrollTo({ top: edge === 'bottom' ? r.bottom + window.scrollY - document.documentElement.clientHeight + gap : r.top + window.scrollY - gap, behavior: 'instant' });
};
const quietReset = form => {
    muteReset = true;
    form.reset();
    muteReset = false;
};
const clearPackOutput = () => {
    main_data_create.style.display = 'none';
    lastPackIdInput.textContent = '';
    QRCodehtml.innerHTML = '';
};
const setVerifyResult = (html = '') => {
    verifyResult.innerHTML = html;
    verifyResult.style.display = html ? 'block' : 'none';
};
const clearTransfer = () => {
    transferownerform.onsubmit = null;
    transferownerform.innerHTML = '';
    transferownerform.style.display = 'none';
    transferOwnerBtn.innerHTML = '';
    transferOwnerBtn.style.display = 'none';
    transferOwnerBtn.disabled = false;
};

const main_sec = geid('main_btns');
const createPackBtn = geid('createPackBtn');
const scanVerifyBtn = geid('scanVerifyBtn');
const transferOwnerBtn = geid('transferOwnerBtn');
const infoBtn = geid('infoBtn');
const websitecreatorbtn = geid('about-the-creator-btn');
const createPackform = geid('createPack');
const NameInput = geid('m_name');
const BatchInput = geid('m_batch');
const ManInput = geid('m_man');
const ExpInput = geid('m_exp');
const QtyInput = geid('m_qty');
const QtyUnitInput = geid('m_qty_unit');
const ManufacturerInput = geid('m_manufacturer');
const LicenseInput = geid('m_license');
const CompanyEmailInput = geid('m_company_email');
const locationInput = geid('m_location');
const ManagerNameInput = geid('m_manager_name');
const ManagerEmailInput = geid('m_manager_email');
const main_data_create = geid('main_data_create');
const lastPackIdInput = geid('PackId');
const copyPackIdBtn = geid('copyPackIdBtn');
const downloadQrBtn = geid('downloadQrBtn');
const QRCodehtml = geid('qrcode');
const scanverifyform = geid('scan_verify');
const verifyIdInput = geid('verifyID');
const verifyResult = geid('verifyResult');
const transferownerform = geid('transfer_owner');
const infosec = geid('info_sec');
const sl = document.querySelector('label[for="m_manufacturer"]');

const database = (firebase.initializeApp({
    apiKey: 'AIzaSyDY453ohxvPoizc0BUngVbqblVGAAfsX4Q',
    authDomain: 'mrindia-0.firebaseapp.com',
    databaseURL: 'https://mrindia-0-default-rtdb.asia-southeast1.firebasedatabase.app',
    projectId: 'mrindia-0',
    storageBucket: 'mrindia-0.firebasestorage.app',
    messagingSenderId: '829263357469',
    appId: '1:829263357469:web:56e8ff92e299edee83c8f4',
    measurementId: 'G-DM9KX3VTTH'
}), firebase.firestore()).collection('Smart_India_Hackathon_2025');
const guards = { create: createSaveGuard(), transfer: createSaveGuard() };
const textletter = 'All Text Fields (Names, Batch, License, Unit, Address, Email, Storage Condition, etc.) MUST Contain Atleast One Letter. Numbers or Symbols ALONE are NOT Allowed.';
const qtyvalidvalue = 'Quantity MUST be a Number Greater than Zero (e.g. 10 or 2.5).';
const stages = ['Manufacturer', 'Warehouse', 'Distributor', 'Retailer', 'Clinic', 'Customer'];
const receivedFields = Object.fromEntries(stages.slice(1).map((stage, i) => [stage, {
    name: `Name_of_Medicine_received_from_${stages[i]}`,
    license: `License_Number_received_from_${stages[i]}`,
    batch: `Batch_ID_of_Medicine_received_from_${stages[i]}`,
    quantity: `Quantity_Received_from_${stages[i]}`
}]));
const receiptStorageLabel = 'Storage Condition at Receipt (e.g., Temperature, Humidity)';
const transferSteps = {
    Warehouse: {
        prefix: 'wh', qtyLabel: 'Quantity of Medicine Received from Manufacturer', qtyHint: 'e.g., 5000 strips',
        storageLabel: 'Storage Condition of Medicine (e.g., Temperature, Humidity)', storageHint: 'e.g., 2 - 8°C, 60% RH',
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
let copiedTimer = null, muteReset = false, verifySeq = 0;

createPackBtn.onclick = () => {
    verifySeq++;
    quietReset(scanverifyform);
    setVerifyResult();
    clearTransfer();
    scanverifyform.style.display = 'none';
    scanVerifyBtn.disabled = false;
    createPackBtn.disabled = true;
    createPackform.style.display = 'block';
    jumpGap(sl, 'bottom');
    NameInput.focus();
};
createPackform.onsubmit = createPack;
createPackform.onreset = () => {
    if (muteReset) return;
    clearPackOutput();
    setTimeout(() => {
        jumpGap(sl, 'bottom');
        NameInput.focus();
    });
};
scanVerifyBtn.onclick = () => {
    quietReset(createPackform);
    clearPackOutput();
    createPackform.style.display = 'none';
    createPackBtn.disabled = false;
    transferownerform.style.display = 'none';
    transferOwnerBtn.disabled = false;
    scanVerifyBtn.disabled = true;
    scanverifyform.style.display = 'block';
    jumpGap(main_sec, null, 10);
    verifyIdInput.focus();
};
scanverifyform.onsubmit = verifyPack;
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
transferOwnerBtn.onclick = () => {
    scanverifyform.style.display = 'none';
    scanVerifyBtn.disabled = false;
    transferOwnerBtn.disabled = true;
    transferownerform.style.display = 'block';
    jumpGap(txAnchor(), 'bottom');
    txFocus();
};
transferownerform.onreset = () => {
    if (muteReset) return;
    setTimeout(() => {
        jumpGap(txAnchor(), 'bottom', 2);
        txFocus();
    });
};
copyPackIdBtn.onclick = async () => {
    const text = lastPackIdInput.textContent.trim();
    if (!text) return;
    try { await navigator.clipboard.writeText(text); }
    catch { return alert('Could not Copy Automatically. Please Select the Pack ID and Copy It Manually.'); }
    copyPackIdBtn.classList.add('copied');
    clearTimeout(copiedTimer);
    copiedTimer = setTimeout(() => copyPackIdBtn.classList.remove('copied'), 1200);
};
downloadQrBtn.onclick = () => {
    const src = QRCodehtml.querySelector('canvas');
    if (!src) return;
    const margin = 24, c = document.createElement('canvas');
    c.width = src.width + margin * 2;
    c.height = src.height + margin * 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(src, margin, margin);
    saveFile(c.toDataURL('image/png'), `${dlName(lastPackIdInput.textContent.trim(), 'QR')}.png`);
};

[[infoBtn, infosec, 'Website Information'], [websitecreatorbtn, document.querySelector('footer'), 'About the Creator']].forEach(([btn, section, label]) => btn.onclick = () => {
    const showing = section.style.display === 'block';
    section.style.display = showing ? 'none' : 'block';
    btn.textContent = `${showing ? 'Show' : 'Hide'} ${label}`;
});

async function createPack(e) {
    e.preventDefault();
    if (guards.create.isBusy()) return;
    const man = parseDateTimeInput(ManInput.value);
    const exp = parseDateTimeInput(ExpInput.value);
    if (!man) return alert('Please Enter a Valid Manufacturing date.');
    if (!exp) return alert('Please Enter a Valid Expiry date.');
    const today = startOfDay(new Date());
    if (man > today) return alert('Manufacturing Date CANNOT be in the future.');
    if (man > exp) return alert('Expiry date CANNOT be before the Manufacturing date.');
    if (exp < today) return alert('This Medicine has Already Expired. Cannot Register an Expired Medicine.');
    const qty = parseQty(QtyInput.value.trim());
    if (qty === null) return alert(qtyvalidvalue);
    const values = [NameInput, ManufacturerInput, BatchInput, QtyUnitInput, locationInput, ManagerNameInput, ManagerEmailInput, CompanyEmailInput, LicenseInput].map(input => input.value.trim());
    const [name, manufacturer, batch, qtyUnit, location, managerName, managerEmail, companyEmail, license] = values;
    if (!values.every(hasLetter)) return alert(textletter);
    const limit = 0xFFFFFFFF - (0x100000000 % 10), digits = [], buffer = new Uint32Array(13);
    while (digits.length < 13) {
        crypto.getRandomValues(buffer);
        for (const v of buffer) if (digits.length < 13 && v <= limit) digits.push(v % 10);
    }
    const packId = `SIH-PK-${digits.join('')}`;
    clearPackOutput();
    const details = {
        Name_of_Medicine: name,
        Owning_Company: manufacturer,
        Medicine_Batch: batch,
        Manufacturing_Date_of_Medicine: ManInput.value,
        Expiry_Date_of_Medicine: ExpInput.value,
        Quantity: qty,
        Quantity_Unit: qtyUnit,
        Location_of_Manufacturing_Plant: location,
        Plant_Manager: managerName,
        Manager_Email: managerEmail,
        Company_Email: companyEmail,
        License_Number: license
    };
    await guards.create.run(
        () => database.doc(packId).set({
            Manufacturer: {
                ...details,
                Manufacturing_Date_of_Medicine: toDateTimestamp(man),
                Expiry_Date_of_Medicine: toDateTimestamp(exp),
                Added_to_Database: serverNowStamp()
            }
        }),
        () => {
            lastPackIdInput.textContent = packId;
            main_data_create.style.display = 'block';
            try {
                QRCodehtml.innerHTML = '';
                new QRCode(QRCodehtml, { text: packId, width: 406, height: 406 });
            } catch (error) {
                console.error(error);
                QRCodehtml.textContent = 'QR Code could NOT be Generated (See Failure Reason in Console). Please Use the Pack ID Above Instead!';
            }
            document.activeElement?.blur();
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' });
            try { downloadJson({ Pack_ID: packId, ...details }, dlName(packId)); }
            catch (error) { console.error(error); }
            quietReset(createPackform);
            alert('Pack created.\nPlease Copy and Save the Pack ID using the Copy Button, as It Will be Required for Future Verification and Ownership Transfers.\nA JSON Copy of the Entered Details has been Downloaded.');
        },
        error => alert(`Error Creating New Medicine Pack in Database : ${error}`)
    );
}

async function verifyPack(e) {
    e.preventDefault();
    const span = (cls, text) => `<span class = '${cls}'>${esc(text)}</span>`;
    const stg1 = s => span('stg1', s);
    const stg2 = s => span('stg2', s);
    const pid = s => span('pid', s);
    const fv1 = label => span('fld1', label);
    const fv2 = label => span('fld2', label);
    const date_input_stage = stage => stage === 'Manufacturer' ? ['Manufacturing_Date_of_Medicine', 'Expiry_Date_of_Medicine', 'Added_to_Database'] : ['DateTime_Received', 'Added_to_Database'];
    const fail = (errorMsg, whathappened = 'is Tampered') => setVerifyResult(`Pack ID ${pid(id)} ${ctxt(whathappened)}!\n${errorMsg}.\nOwnership ${ctxt('Cannot be Transferred')} Further!`);
    const fieldTag = (key, stage) => span('nxt', transferSteps[stage]?.party.find(([dbKey]) => dbKey === key)?.[2] ?? (receivedFields[stage] && { [receivedFields[stage].batch]: 'Batch ID', [receivedFields[stage].name]: 'Medicine Name', [receivedFields[stage].license]: 'License Number', [receivedFields[stage].quantity]: 'Quantity' }[key]) ?? fieldLabels[key] ?? key.replace(/_/g, ' '));
    const fieldLabels = {
        Name_of_Medicine: 'Medicine Name', Owning_Company: 'Manufacturing Company', Medicine_Batch: 'Batch ID',
        Manufacturing_Date_of_Medicine: 'Manufacturing Date', Expiry_Date_of_Medicine: 'Expiry Date',
        Quantity: 'Quantity', Quantity_Unit: 'Quantity Unit', Location_of_Manufacturing_Plant: 'Plant Address',
        Plant_Manager: 'Plant Manager Name', Manager_Email: 'Plant Manager Email ID', Company_Email: 'Company Email ID',
        License_Number: 'License Number', Storage_Condition: 'Storage Condition',
        DateTime_Received: 'Date Received', Added_to_Database: 'Date Added'
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
        { label: 'Batch ID', mfrKey: 'Medicine_Batch', stageKey: s => receivedFields[s].batch },
        { label: 'Medicine Name', mfrKey: 'Name_of_Medicine', stageKey: s => receivedFields[s].name },
        { label: 'License Number', mfrKey: 'License_Number', stageKey: s => receivedFields[s].license },
        { label: 'Quantity', mfrKey: 'Quantity', stageKey: s => receivedFields[s].quantity, normalize: v => parseQty(String(v ?? '').trim()) ?? NaN },
        { label: 'Quantity Unit', mfrKey: 'Quantity_Unit', stageKey: () => 'Quantity_Unit' }
    ];
    const seq = ++verifySeq;
    clearTransfer();
    jumpGap(main_sec);
    verifyIdInput.focus();
    const id = verifyIdInput.value.trim();
    setVerifyResult('Verifying, Please Wait...');
    try {
        const doc = await database.doc(id).get();
        if (seq !== verifySeq) return;
        if (!doc.exists) return setVerifyResult(`No Records Found for Pack ID ${pid(id)}.\nThis Indicates that the Pack ID or QR Code Printed over the Medicine is ${ctxt('Invalid')},\nas it ${ctxt('Does NOT Exist')} in our Database.`);
        const data = doc.data({ serverTimestamps: 'estimate' });
        const presentStages = stages.filter(stage => stage in data);
        if (presentStages.length === 0) return setVerifyResult(`Pack ID ${pid(id)} has ${ctxt('NO Supply Chain')}!\nThis Pack ${ctxt('Exists', 'cs')} in our Database, but ${ctxt('No Stage')} has been Recorded for it, not even ${stg1('Manufacturer')}.\nOwnership ${ctxt('Cannot be Transferred')} Further!`);
        for (let i = 0; i < presentStages.length; i++) if (stages[i] !== presentStages[i]) return fail(`Stage ${stg1(stages[i])} is ${ctxt('Missing')} from the Chain, although the ${span('nxt', 'Next Stage')} ${stg2(presentStages[i])} ${ctxt('Exists', 'cs')}`, 'has Broken Supply Chain');
        for (const stage of presentStages) {
            const rec = data[stage];
            const recProblem = checkRecord(rec);
            if (recProblem) return fail(`Data of Stage ${stg1(stage)} ${recProblem}`);
            for (const field of requiredFields[stage]) {
                if (!(field in rec)) return fail(`${ctxt('Missing Required Data Field')} ${fieldTag(field, stage)} in Stage ${stg1(stage)}`);
                const v = rec[field];
                const problem = date_input_stage(stage).includes(field) ? checkDate(v, field) : field === 'Quantity' || field.startsWith('Quantity_Received_from_') ? checkQty(v) : field.endsWith('Email') ? checkEmail(v) : checkText(v);
                if (problem) return fail(`${fieldTag(field, stage)} in Stage ${stg1(stage)} ${problem}`);
            }
        }
        for (const stage of presentStages.slice(1)) {
            for (const { label, mfrKey, stageKey, normalize = a => String(a ?? '').trim().replace(/\s+/g, ' ').toLowerCase() } of matchChecks) {
                const raw = data[stage][stageKey(stage)];
                if (raw !== undefined && normalize(raw) !== normalize(data.Manufacturer[mfrKey])) return fail(`${ctxt(label, 'cs')} at ${stg1(stage)} ${ctxt('Does NOT Match')} the ${stg2('Manufacturer')} Record`);
            }
        }
        const parsed = {};
        for (const stage of presentStages) {
            parsed[stage] = {};
            for (const field of date_input_stage(stage)) {
                const parsedDate = fromFirestoreDate(data[stage][field], dateParseOptions(field));
                if (!parsedDate) return fail(`${fieldTag(field, stage)} in Stage ${stg1(stage)} is ${ctxt('Invalid')}: Not a Valid Date`);
                parsed[stage][field] = startOfDay(parsedDate);
            }
        }
        const today = startOfDay(new Date());
        const man = parsed.Manufacturer.Manufacturing_Date_of_Medicine;
        const exp = parsed.Manufacturer.Expiry_Date_of_Medicine;
        if (man > exp) return fail(`${fv1('Manufacturing Date')} ${ctxt('is After')} ${fv2('Expiry Date')}`, `is ${ctxt('Invalid')}`);
        if (man > today) return fail(`${fv1('Manufacturing Date')} is in the Future`);
        for (let i = 0; i < presentStages.length; i++) {
            const stage = presentStages[i];
            const added = parsed[stage].Added_to_Database;
            const addedAt = `${fv1(fieldLabels.Added_to_Database)} at Stage ${stg1(stage)}`;
            if (added > today) return fail(`${addedAt} is in the Future`);
            if (added < man) return fail(`${addedAt}, ${ctxt('is Before')} ${fv2('Manufacturing Date')} of Medicine`);
            if (added > exp) return fail(`${addedAt}, ${ctxt('is After')} ${fv2('Expiry Date')} of Medicine`, 'is Expired');
            if (i === 0) continue;
            const prevStage = presentStages[i - 1];
            const prevAdded = parsed[prevStage].Added_to_Database;
            const received = parsed[stage].DateTime_Received;
            const receivedAt = `${fv1(fieldLabels.DateTime_Received)} at Stage ${stg1(stage)}`;
            if (received > today) return fail(`${receivedAt} is in the Future`);
            if (received < man) return fail(`${receivedAt}, ${ctxt('is Before')} ${fv2('Manufacturing Date')} of Medicine`);
            if (received > exp) return fail(`${receivedAt}, ${ctxt('is After')} ${fv2('Expiry Date')}`, 'is Expired');
            if (received < prevAdded) return fail(`${receivedAt}, ${ctxt('is Before')} ${fv2(fieldLabels.Added_to_Database)} of ${span('nxt', 'Previous')} Stage ${stg2(prevStage)}`);
            if (received > added) return fail(`${receivedAt}, ${ctxt('is After')} Its Own ${fv2(fieldLabels.Added_to_Database)}`);
            if (added < prevAdded) return fail(`${fv1(fieldLabels.Added_to_Database)} of Stage ${stg1(stage)} ${ctxt('is Before')} ${fv2(fieldLabels.Added_to_Database)} of previous stage ${stg2(prevStage)}`);
        }
        if (exp < today) return fail(`Medicine ${ctxt('Expired')}: ${fv1('Expiry Date')} has already passed`, `is ${ctxt('Expired')}`);
        const currentStage = presentStages[presentStages.length - 1];
        setVerifyResult(`Pack ID ${pid(id)} ${ctxt('Successfully Verified', 'good')}!\nThis Pack is ${ctxt('Valid', 'good')} and ${ctxt('Exists', 'good')} in our database.\nCurrent Stage: ${ctxt(currentStage, 'cs')}.`);
        if (currentStage === 'Customer') verifyResult.innerHTML += `<span class = 'final-note'>${ctxt('✔ This Medicine has Already Reached the Customer.', 'good')} ${ctxt('No Further Transfers Allowed.', 'cs')}</span>`;
        else buildTransferForm(id, currentStage);
    } catch (error) {
        if (seq !== verifySeq) return;
        setVerifyResult(`An Error occurred while Verifying : ${ctxt(esc(error))}. Please try again.`);
    } finally {
        if (seq === verifySeq) {
            jumpGap(main_sec);
            (transferOwnerBtn.style.display === 'block' ? transferOwnerBtn : verifyIdInput).focus();
        }
    }
}

function buildTransferForm(packid, fromStage) {
    const toStage = stages[stages.indexOf(fromStage) + 1];
    const cfg = transferSteps[toStage];
    if (!cfg) return;
    const toDateString = value => {
        const d = mustParseDate(value);
        return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    };
    const p = cfg.prefix;
    const rf = receivedFields[toStage];
    const title = `Transfer Ownership: <span class = 'tx-from'>${fromStage}</span> → <span class = 'tx-to'>${toStage}</span>`;
    const textKeys = ['batch', 'med_name', 'license', 'qty_unit', ...cfg.party.map(([, key]) => key), ...(cfg.storageLabel ? ['storage_condition'] : [])];
    const field = (key, label, type, { hint = '', attrs = '' } = {}) => `<label for = '${p}_${key}'>${label} : </label>
    <input type = '${type}' id = '${p}_${key}' name = '${p}_${key}' ${hint ? `placeholder = '${hint}'` : ''} ${attrs} required>`;
    transferownerform.innerHTML = `
        <h2>${title}</h2>
        ${field('pack', 'Pack ID', 'text', { attrs: `value = '${esc(packid)}' readonly` })}
        ${field('new_owner', 'New Owner Category', 'text', { attrs: `value = '${toStage}' readonly` })}
        ${field('med_name', 'Medicine Name', 'text', { hint: 'e.g., Paracetamol 500mg' })}
        ${field('batch', 'Batch of Medicine', 'text', { hint: 'e.g., B2025-001' })}
        ${field('license', 'Manufacturing License Number', 'text', { hint: 'e.g., A0024518' })}
        ${field('qty_received', cfg.qtyLabel, 'number', { hint: cfg.qtyHint, attrs: `min = '0' step = 'any'` })}
        ${field('qty_unit', 'Quantity Unit', 'text', { hint: 'e.g., strips, tablets, g' })}
        ${field('received_time', 'Date of Receiving the Medicine', 'date', { attrs: `max = '${toDateString(new Date())}'` })}
        ${cfg.storageLabel ? field('storage_condition', cfg.storageLabel, 'text', { hint: cfg.storageHint }) : ''}
        ${cfg.party.map(([, key, label, type, hint]) => field(key, label, type, { hint })).join('')}
        <button type = 'submit'>Transfer Ownership</button>
        <button type = 'reset'>Reset Form</button>
    `;
    transferownerform.onsubmit = e => {
        e.preventDefault();
        const val = key => geid(`${p}_${key}`).value.trim();
        if (!textKeys.every(key => hasLetter(val(key)))) return alert(textletter);
        const qtyReceived = parseQty(val('qty_received'));
        if (qtyReceived === null) return alert(qtyvalidvalue);
        const receivedDate = parseDateTimeInput(val('received_time'));
        if (!receivedDate) return alert('Please enter a Valid Date of Receiving.');
        if (startOfDay(receivedDate) > startOfDay(new Date())) return alert('Date of Receiving CANNOT be in the Future.');
        const party = Object.fromEntries(cfg.party.map(([dbKey, key]) => [dbKey, val(key)]));
        const ownerName = party[`${toStage}_Name`];
        const ownerLoc = party[`${toStage}_Location`];
        const entered = {
            [rf.batch]: val('batch'),
            [rf.name]: val('med_name'),
            [rf.license]: val('license'),
            ...party,
            [rf.quantity]: qtyReceived,
            Quantity_Unit: val('qty_unit'),
            DateTime_Received: toDateString(receivedDate),
            ...(cfg.storageLabel ? { Storage_Condition: val('storage_condition') } : {})
        };
        guards.transfer.run(
            () => database.doc(packid).set({ [toStage]: { ...entered, DateTime_Received: toDateTimestamp(receivedDate), Added_to_Database: serverNowStamp() } }, { merge: true }),
            () => {
                try { downloadJson({ Pack_ID: packid, From_Stage: fromStage, To_Stage: toStage, ...entered }, dlName(packid, `${fromStage} → ${toStage}`)); }
                catch (error) { console.error(error); }
                quietReset(transferownerform);
                clearTransfer();
                quietReset(scanverifyform);
                setVerifyResult();
                scanverifyform.style.display = 'none';
                scanVerifyBtn.disabled = false;
                document.activeElement?.blur();
                window.scrollTo({ top: 0, behavior: 'instant' });
                alert(`Ownership of Pack ID ${packid} Successfully Transferred to ${toStage}: ${ownerLoc ? `${ownerName}, ${ownerLoc}` : ownerName}\nA JSON Copy of the Entered Details has been Downloaded.`);
            },
            error => alert(`Error Transferring Ownership to ${toStage} in Database : ${error}`)
        );
    };
    transferOwnerBtn.innerHTML = title;
    transferOwnerBtn.disabled = false;
    transferOwnerBtn.style.display = 'block';
}