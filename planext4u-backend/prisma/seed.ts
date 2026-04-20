import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ─── Super Admin ─────────────────────────────────────────────────────────
  const admin = await prisma.admin.upsert({
    where: { email: 'admin@planext4u.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@planext4u.com',
      password_hash: await bcrypt.hash('Admin@123', 12),
      role: 'super_admin',
    },
  });
  console.log('Admin created:', admin.email);

  // ─── Cities ──────────────────────────────────────────────────────────────
  const cities = await Promise.all([
    prisma.city.upsert({ where: { id: 'city-mumbai' }, update: {}, create: { id: 'city-mumbai', name: 'Mumbai', state: 'Maharashtra' } }),
    prisma.city.upsert({ where: { id: 'city-delhi' },  update: {}, create: { id: 'city-delhi',  name: 'Delhi',  state: 'Delhi' } }),
    prisma.city.upsert({ where: { id: 'city-bangalore' }, update: {}, create: { id: 'city-bangalore', name: 'Bangalore', state: 'Karnataka' } }),
    prisma.city.upsert({ where: { id: 'city-hyderabad' }, update: {}, create: { id: 'city-hyderabad', name: 'Hyderabad', state: 'Telangana' } }),
    prisma.city.upsert({ where: { id: 'city-pune' }, update: {}, create: { id: 'city-pune', name: 'Pune', state: 'Maharashtra' } }),
  ]);
  console.log('Cities seeded:', cities.length);

  // ─── Areas ───────────────────────────────────────────────────────────────
  await prisma.area.upsert({ where: { id: 'area-andheri' },  update: {}, create: { id: 'area-andheri',  city_id: 'city-mumbai',    name: 'Andheri',    pincode: '400053' } });
  await prisma.area.upsert({ where: { id: 'area-bandra' },   update: {}, create: { id: 'area-bandra',   city_id: 'city-mumbai',    name: 'Bandra',     pincode: '400050' } });
  await prisma.area.upsert({ where: { id: 'area-koregaon' }, update: {}, create: { id: 'area-koregaon', city_id: 'city-pune',      name: 'Koregaon Park', pincode: '411001' } });
  await prisma.area.upsert({ where: { id: 'area-koramangala' }, update: {}, create: { id: 'area-koramangala', city_id: 'city-bangalore', name: 'Koramangala', pincode: '560034' } });
  console.log('Areas seeded');

  // ─── Categories ──────────────────────────────────────────────────────────
  const categories = ['Electronics', 'Fashion', 'Grocery', 'Home & Kitchen', 'Health & Beauty', 'Sports', 'Books', 'Toys'];
  for (const name of categories) {
    await prisma.category.upsert({
      where: { id: `cat-${name.toLowerCase().replace(/\W+/g, '-')}` },
      update: {},
      create: { id: `cat-${name.toLowerCase().replace(/\W+/g, '-')}`, name },
    });
  }
  console.log('Categories seeded');

  // ─── Service Categories ───────────────────────────────────────────────────
  const serviceCategories = ['Plumbing', 'Electrical', 'Cleaning', 'AC Service', 'Appliance Repair', 'Painting', 'Carpentry', 'Beauty & Wellness'];
  for (const name of serviceCategories) {
    await prisma.serviceCategory.upsert({
      where: { id: `scat-${name.toLowerCase().replace(/\W+/g, '-')}` },
      update: {},
      create: { id: `scat-${name.toLowerCase().replace(/\W+/g, '-')}`, name },
    });
  }
  console.log('Service categories seeded');

  // ─── Occupations ─────────────────────────────────────────────────────────
  const occupations = ['Student', 'Salaried', 'Business Owner', 'Freelancer', 'Homemaker', 'Retired'];
  for (const name of occupations) {
    const id = `occ-${name.toLowerCase().replace(/\W+/g, '-')}`;
    await prisma.occupation.upsert({ where: { id }, update: {}, create: { id, name } });
  }
  console.log('Occupations seeded');

  // ─── Vendor Plans ─────────────────────────────────────────────────────────
  await prisma.vendorPlan.upsert({
    where: { id: 'plan-basic' },
    update: {},
    create: { id: 'plan-basic', name: 'Basic', commission_rate: 10, max_products: 50, price: 0, duration_days: 30 },
  });
  await prisma.vendorPlan.upsert({
    where: { id: 'plan-pro' },
    update: {},
    create: { id: 'plan-pro', name: 'Pro', commission_rate: 7, max_products: 500, price: 999, duration_days: 30 },
  });
  await prisma.vendorPlan.upsert({
    where: { id: 'plan-enterprise' },
    update: {},
    create: { id: 'plan-enterprise', name: 'Enterprise', commission_rate: 5, max_products: 999999, price: 4999, duration_days: 30 },
  });
  console.log('Vendor plans seeded');

  // ─── Platform Variables ────────────────────────────────────────────────────
  const vars = [
    { key: 'welcome_bonus_points', value: '200', description: 'Points awarded on registration' },
    { key: 'referral_bonus_points', value: '100', description: 'Points awarded per referral' },
    { key: 'order_reward_pct', value: '2', description: 'Order completion reward percentage' },
    { key: 'min_order_amount', value: '50', description: 'Minimum order amount in INR' },
    { key: 'max_cod_amount', value: '5000', description: 'Maximum Cash on Delivery order amount' },
  ];
  for (const v of vars) {
    await prisma.platformVariable.upsert({
      where: { key: v.key },
      update: { value: v.value },
      create: { id: `pvar-${v.key}`, ...v },
    });
  }
  console.log('Platform variables seeded');

  // ─── States & Districts (India) ───────────────────────────────────────────
  const stateDistricts: Record<string, string[]> = {
    'Andhra Pradesh': ['Anantapur', 'Chittoor', 'East Godavari', 'Guntur', 'Krishna', 'Kurnool', 'Nellore', 'Prakasam', 'Srikakulam', 'Visakhapatnam', 'Vizianagaram', 'West Godavari', 'YSR Kadapa'],
    'Arunachal Pradesh': ['Anjaw', 'Changlang', 'East Kameng', 'East Siang', 'Itanagar', 'Lohit', 'Lower Subansiri', 'Papum Pare', 'Tawang', 'Tirap', 'Upper Siang', 'Upper Subansiri', 'West Kameng', 'West Siang'],
    'Assam': ['Barpeta', 'Bongaigaon', 'Cachar', 'Darrang', 'Dhubri', 'Dibrugarh', 'Goalpara', 'Golaghat', 'Guwahati', 'Jorhat', 'Kamrup', 'Karbi Anglong', 'Nagaon', 'Nalbari', 'Sivasagar', 'Sonitpur', 'Tinsukia'],
    'Bihar': ['Araria', 'Aurangabad', 'Banka', 'Begusarai', 'Bhagalpur', 'Bhojpur', 'Darbhanga', 'Gaya', 'Gopalganj', 'Jamui', 'Jehanabad', 'Katihar', 'Madhubani', 'Muzaffarpur', 'Nalanda', 'Patna', 'Purnia', 'Rohtas', 'Samastipur', 'Saran', 'Sitamarhi', 'Siwan', 'Vaishali'],
    'Chhattisgarh': ['Bastar', 'Bilaspur', 'Dantewada', 'Dhamtari', 'Durg', 'Jagdalpur', 'Janjgir-Champa', 'Jashpur', 'Kanker', 'Korba', 'Koriya', 'Mahasamund', 'Raigarh', 'Raipur', 'Rajnandgaon', 'Surguja'],
    'Goa': ['North Goa', 'South Goa'],
    'Gujarat': ['Ahmedabad', 'Amreli', 'Anand', 'Banaskantha', 'Bharuch', 'Bhavnagar', 'Gandhinagar', 'Jamnagar', 'Junagadh', 'Kheda', 'Kutch', 'Mehsana', 'Navsari', 'Panchmahal', 'Patan', 'Porbandar', 'Rajkot', 'Sabarkantha', 'Surat', 'Vadodara', 'Valsad'],
    'Haryana': ['Ambala', 'Bhiwani', 'Faridabad', 'Fatehabad', 'Gurugram', 'Hisar', 'Jhajjar', 'Jind', 'Kaithal', 'Karnal', 'Kurukshetra', 'Mahendragarh', 'Panchkula', 'Panipat', 'Rewari', 'Rohtak', 'Sirsa', 'Sonipat', 'Yamunanagar'],
    'Himachal Pradesh': ['Bilaspur', 'Chamba', 'Hamirpur', 'Kangra', 'Kinnaur', 'Kullu', 'Lahaul and Spiti', 'Mandi', 'Shimla', 'Sirmaur', 'Solan', 'Una'],
    'Jharkhand': ['Bokaro', 'Chatra', 'Deoghar', 'Dhanbad', 'Dumka', 'East Singhbhum', 'Garhwa', 'Giridih', 'Godda', 'Gumla', 'Hazaribagh', 'Jamshedpur', 'Koderma', 'Lohardaga', 'Pakur', 'Palamu', 'Ranchi', 'Sahibganj', 'Saraikela Kharsawan', 'Simdega', 'West Singhbhum'],
    'Karnataka': ['Bagalkot', 'Bangalore Rural', 'Bangalore Urban', 'Belgaum', 'Bellary', 'Bidar', 'Bijapur', 'Chamarajanagar', 'Chikkaballapur', 'Chikmagalur', 'Chitradurga', 'Dakshina Kannada', 'Davanagere', 'Dharwad', 'Gadag', 'Gulbarga', 'Hassan', 'Haveri', 'Kodagu', 'Kolar', 'Koppal', 'Mandya', 'Mysore', 'Raichur', 'Ramanagara', 'Shimoga', 'Tumkur', 'Udupi', 'Uttara Kannada', 'Yadgir'],
    'Kerala': ['Alappuzha', 'Ernakulam', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam', 'Kottayam', 'Kozhikode', 'Malappuram', 'Palakkad', 'Pathanamthitta', 'Thiruvananthapuram', 'Thrissur', 'Wayanad'],
    'Madhya Pradesh': ['Balaghat', 'Bhopal', 'Chhatarpur', 'Chhindwara', 'Damoh', 'Dewas', 'Dhar', 'Guna', 'Gwalior', 'Hoshangabad', 'Indore', 'Jabalpur', 'Khandwa', 'Khargone', 'Mandsaur', 'Morena', 'Narsinghpur', 'Neemuch', 'Panna', 'Ratlam', 'Rewa', 'Sagar', 'Satna', 'Sehore', 'Seoni', 'Shivpuri', 'Tikamgarh', 'Ujjain', 'Vidisha'],
    'Maharashtra': ['Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'],
    'Manipur': ['Bishnupur', 'Chandel', 'Churachandpur', 'Imphal East', 'Imphal West', 'Senapati', 'Tamenglong', 'Thoubal', 'Ukhrul'],
    'Meghalaya': ['East Garo Hills', 'East Khasi Hills', 'Jaintia Hills', 'Ri Bhoi', 'Shillong', 'South Garo Hills', 'West Garo Hills', 'West Khasi Hills'],
    'Mizoram': ['Aizawl', 'Champhai', 'Kolasib', 'Lawngtlai', 'Lunglei', 'Mamit', 'Saiha', 'Serchhip'],
    'Nagaland': ['Dimapur', 'Kiphire', 'Kohima', 'Longleng', 'Mokokchung', 'Mon', 'Peren', 'Phek', 'Tuensang', 'Wokha', 'Zunheboto'],
    'Odisha': ['Angul', 'Balangir', 'Balasore', 'Bargarh', 'Bhadrak', 'Bhubaneswar', 'Boudh', 'Cuttack', 'Deogarh', 'Dhenkanal', 'Gajapati', 'Ganjam', 'Jagatsinghpur', 'Jajpur', 'Jharsuguda', 'Kalahandi', 'Kandhamal', 'Kendrapara', 'Kendujhar', 'Khordha', 'Koraput', 'Malkangiri', 'Mayurbhanj', 'Nabarangpur', 'Nayagarh', 'Nuapada', 'Puri', 'Rayagada', 'Sambalpur', 'Subarnapur', 'Sundargarh'],
    'Punjab': ['Amritsar', 'Barnala', 'Bathinda', 'Faridkot', 'Fatehgarh Sahib', 'Ferozepur', 'Gurdaspur', 'Hoshiarpur', 'Jalandhar', 'Kapurthala', 'Ludhiana', 'Mansa', 'Moga', 'Mohali', 'Muktsar', 'Pathankot', 'Patiala', 'Rupnagar', 'Sangrur', 'Tarn Taran'],
    'Rajasthan': ['Ajmer', 'Alwar', 'Banswara', 'Baran', 'Barmer', 'Bharatpur', 'Bhilwara', 'Bikaner', 'Bundi', 'Chittorgarh', 'Churu', 'Dausa', 'Dholpur', 'Dungarpur', 'Hanumangarh', 'Jaipur', 'Jaisalmer', 'Jalore', 'Jhalawar', 'Jhunjhunu', 'Jodhpur', 'Karauli', 'Kota', 'Nagaur', 'Pali', 'Pratapgarh', 'Rajsamand', 'Sawai Madhopur', 'Sikar', 'Sirohi', 'Tonk', 'Udaipur'],
    'Sikkim': ['East Sikkim', 'Gangtok', 'North Sikkim', 'South Sikkim', 'West Sikkim'],
    'Tamil Nadu': ['Ariyalur', 'Chennai', 'Coimbatore', 'Cuddalore', 'Dharmapuri', 'Dindigul', 'Erode', 'Kanchipuram', 'Kanyakumari', 'Karur', 'Krishnagiri', 'Madurai', 'Nagapattinam', 'Namakkal', 'Nilgiris', 'Perambalur', 'Pudukkottai', 'Ramanathapuram', 'Salem', 'Sivagangai', 'Thanjavur', 'Theni', 'Thoothukudi', 'Tiruchirappalli', 'Tirunelveli', 'Tiruppur', 'Tiruvallur', 'Tiruvannamalai', 'Tiruvarur', 'Vellore', 'Viluppuram', 'Virudhunagar'],
    'Telangana': ['Adilabad', 'Bhadradri Kothagudem', 'Hyderabad', 'Jagtial', 'Jangaon', 'Jayashankar', 'Jogulamba', 'Kamareddy', 'Karimnagar', 'Khammam', 'Komaram Bheem', 'Mahabubabad', 'Mahbubnagar', 'Mancherial', 'Medak', 'Medchal', 'Nagarkurnool', 'Nalgonda', 'Nirmal', 'Nizamabad', 'Peddapalli', 'Rajanna Sircilla', 'Rangareddy', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad', 'Wanaparthy', 'Warangal', 'Yadadri Bhuvanagiri'],
    'Tripura': ['Agartala', 'Dhalai', 'Gomati', 'Khowai', 'North Tripura', 'Sepahijala', 'South Tripura', 'Unakoti', 'West Tripura'],
    'Uttar Pradesh': ['Agra', 'Aligarh', 'Allahabad', 'Ambedkar Nagar', 'Azamgarh', 'Bahraich', 'Ballia', 'Banda', 'Barabanki', 'Bareilly', 'Basti', 'Bijnor', 'Budaun', 'Bulandshahr', 'Chandauli', 'Deoria', 'Etah', 'Etawah', 'Faizabad', 'Farrukhabad', 'Fatehpur', 'Firozabad', 'Gautam Buddha Nagar', 'Ghaziabad', 'Ghazipur', 'Gonda', 'Gorakhpur', 'Hamirpur', 'Hapur', 'Hardoi', 'Hathras', 'Jalaun', 'Jaunpur', 'Jhansi', 'Kannauj', 'Kanpur Nagar', 'Kanpur Dehat', 'Kaushambi', 'Kheri', 'Kushinagar', 'Lalitpur', 'Lucknow', 'Mahoba', 'Mainpuri', 'Mathura', 'Mau', 'Meerut', 'Mirzapur', 'Moradabad', 'Muzaffarnagar', 'Noida', 'Pilibhit', 'Pratapgarh', 'Raebareli', 'Rampur', 'Saharanpur', 'Sambhal', 'Shahjahanpur', 'Shamli', 'Shravasti', 'Siddharthnagar', 'Sitapur', 'Sonbhadra', 'Sultanpur', 'Unnao', 'Varanasi'],
    'Uttarakhand': ['Almora', 'Bageshwar', 'Chamoli', 'Champawat', 'Dehradun', 'Haridwar', 'Nainital', 'Pauri Garhwal', 'Pithoragarh', 'Rudraprayag', 'Tehri Garhwal', 'Udham Singh Nagar', 'Uttarkashi'],
    'West Bengal': ['Bankura', 'Birbhum', 'Burdwan', 'Cooch Behar', 'Darjeeling', 'Dinajpur', 'Hooghly', 'Howrah', 'Jalpaiguri', 'Kolkata', 'Malda', 'Midnapore', 'Murshidabad', 'Nadia', 'North 24 Parganas', 'Purulia', 'Siliguri', 'South 24 Parganas'],
    'Andaman and Nicobar Islands': ['Nicobar', 'North and Middle Andaman', 'Port Blair', 'South Andaman'],
    'Chandigarh': ['Chandigarh'],
    'Dadra and Nagar Haveli and Daman and Diu': ['Dadra and Nagar Haveli', 'Daman', 'Diu'],
    'Delhi': ['Central Delhi', 'East Delhi', 'New Delhi', 'North Delhi', 'North East Delhi', 'North West Delhi', 'Shahdara', 'South Delhi', 'South East Delhi', 'South West Delhi', 'West Delhi'],
    'Jammu and Kashmir': ['Anantnag', 'Bandipora', 'Baramulla', 'Budgam', 'Doda', 'Ganderbal', 'Jammu', 'Kathua', 'Kishtwar', 'Kulgam', 'Kupwara', 'Poonch', 'Pulwama', 'Rajouri', 'Ramban', 'Reasi', 'Samba', 'Shopian', 'Srinagar', 'Udhampur'],
    'Ladakh': ['Kargil', 'Leh'],
    'Lakshadweep': ['Kavaratti'],
    'Puducherry': ['Karaikal', 'Mahe', 'Puducherry', 'Yanam'],
  };
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const [stateName, districts] of Object.entries(stateDistricts)) {
    const stateId = `state-${slug(stateName)}`;
    await prisma.state.upsert({
      where: { id: stateId },
      update: { name: stateName },
      create: { id: stateId, name: stateName },
    });
    for (const dName of districts) {
      const districtId = `district-${slug(stateName)}-${slug(dName)}`;
      await prisma.district.upsert({
        where: { id: districtId },
        update: { name: dName, state_id: stateId },
        create: { id: districtId, name: dName, state_id: stateId },
      });
    }
  }
  console.log(`States seeded: ${Object.keys(stateDistricts).length}`);

  // ─── Tax Configs ──────────────────────────────────────────────────────────
  await prisma.taxConfig.upsert({ where: { id: 'tax-gst-5' }, update: {}, create: { id: 'tax-gst-5', name: 'GST 5%', rate: 5, type: 'GST', applied_to: 'general' } });
  await prisma.taxConfig.upsert({ where: { id: 'tax-gst-12' }, update: {}, create: { id: 'tax-gst-12', name: 'GST 12%', rate: 12, type: 'GST', applied_to: 'general' } });
  await prisma.taxConfig.upsert({ where: { id: 'tax-gst-18' }, update: {}, create: { id: 'tax-gst-18', name: 'GST 18%', rate: 18, type: 'GST', applied_to: 'general' } });
  await prisma.taxConfig.upsert({ where: { id: 'tax-gst-28' }, update: {}, create: { id: 'tax-gst-28', name: 'GST 28%', rate: 28, type: 'GST', applied_to: 'luxury' } });
  console.log('Tax configs seeded');

  console.log('Seeding complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
