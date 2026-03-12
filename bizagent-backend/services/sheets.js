const { google } = require('googleapis');

let auth;
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive"
      ]
    });
  } catch (error) {
    console.warn("Could not parse GOOGLE_SERVICE_ACCOUNT_JSON", error.message);
  }
}

const getSheets = async () => {
  const client = await auth.getClient();
  return google.sheets({ version: 'v4', auth: client });
};

const createSheet = async (businessName) => {
  if (!auth) throw new Error("Google Auth is not configured");
  
  const sheets = await getSheets();
  const drive = google.drive({ version: 'v3', auth: await auth.getClient() });
  
  const resource = {
    properties: {
      title: `${businessName} - BizAgent`,
    },
  };
  
  const spreadsheet = await sheets.spreadsheets.create({
    resource,
    fields: 'spreadsheetId',
  });
  
  const sheetId = spreadsheet.data.spreadsheetId;
  
  // Set Row 1 headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1:C1',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [['Date', 'Total Revenue', 'Notes']],
    },
  });

  // Make the spreadsheet universally accessible by anyone with the link
  // (Or you can restrict it to the user's email if provided, but we don't have it natively here)
  await drive.permissions.create({
    fileId: sheetId,
    requestBody: {
      role: 'reader',
      type: 'anyone',
    },
  });

  return sheetId;
};

const updateSheetHeaders = async (sheetId, products) => {
  if (!auth) throw new Error("Google Auth is not configured");
  
  const sheets = await getSheets();
  
  const headers = ['Date'];
  products.forEach(p => headers.push(p.name));
  headers.push('Total Revenue', 'Notes');
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1:Z1',
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [headers],
    },
  });
  
  return headers;
};

const appendSalesRow = async (sheetId, products, salesData, note) => {
  if (!auth) throw new Error("Google Auth is not configured");
  
  const sheets = await getSheets();
  
  // Get current headers to map columns correctly
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1:Z1',
  });
  
  const headers = headerResponse.data.values ? headerResponse.data.values[0] : ['Date', 'Total Revenue', 'Notes'];
  
  let totalRevenue = 0;
  productMap = Object.fromEntries(products.map(p => [p.name, p.price]));
  
  const todayDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
  
  const rowData = new Array(headers.length).fill('');
  rowData[0] = todayDate; // Date
  
  if (salesData.sales && Object.keys(salesData.sales).length > 0) {
    for (const [productName, quantity] of Object.entries(salesData.sales)) {
      const colIndex = headers.indexOf(productName);
      if (colIndex !== -1) {
        rowData[colIndex] = quantity;
      }
      // Calculate revenue
      if (productMap[productName]) {
        totalRevenue += productMap[productName] * quantity;
      }
    }
  } else if (salesData.TotalSales) {
      totalRevenue += salesData.TotalSales;
  }
  
  const revIndex = headers.indexOf('Total Revenue');
  if (revIndex !== -1) rowData[revIndex] = totalRevenue;
  
  const noteIndex = headers.indexOf('Notes');
  if (noteIndex !== -1) rowData[noteIndex] = note || salesData.note || '';
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: 'Sheet1',
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: [rowData],
    },
  });
  
  return rowData;
};

const getAllRows = async (sheetId) => {
  if (!auth) return [];
  
  const sheets = await getSheets();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'Sheet1!A1:Z',
  });
  
  const rows = response.data.values || [];
  if (rows.length < 2) return [];
  
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || 0;
    });
    return obj;
  });
  
  return data;
};

const getTodayRow = async (sheetId) => {
  const allRows = await getAllRows(sheetId);
  const todayDate = new Date().toLocaleDateString('en-GB'); // DD/MM/YYYY
  return allRows.filter(row => row['Date'] === todayDate) || null;
};

module.exports = {
  createSheet,
  updateSheetHeaders,
  appendSalesRow,
  getAllRows,
  getTodayRow,
};
