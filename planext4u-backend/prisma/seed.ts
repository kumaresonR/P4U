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
