import * as db from '../server/db';

async function debug() {
  const employees = await db.getAllEmployees();
  console.log('Total employees:', employees.length);
  console.log('\nSample employee:');
  console.log(JSON.stringify(employees[0], null, 2));

  console.log('\nEmployment types:');
  const types = employees.map(e => e.employmentType);
  console.log([...new Set(types)]);

  const fulltime = employees.filter(e => e.employmentType === 'fulltime');
  const parttime = employees.filter(e => e.employmentType === 'parttime');

  console.log(`\nFulltime: ${fulltime.length}`);
  console.log(`Parttime: ${parttime.length}`);

  process.exit(0);
}

debug();
