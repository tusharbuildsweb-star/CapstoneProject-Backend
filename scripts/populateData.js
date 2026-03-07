const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Restaurant = require('../src/models/Restaurant');
const User = require('../src/models/User');
const Testimonial = require('../src/models/Testimonial');
const restaurantService = require('../src/services/restaurantService');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

const CHENNAI_RESTAURANTS = [
    { name: 'Eka', cuisine: 'Modern Indian', location: 'Adyar', priceRange: '₹₹₹', ambienceTags: ['Romantic', 'Luxury Dining'] },
    { name: 'Adyar Bhavan', cuisine: 'Vegetarian', location: 'Adyar', priceRange: '₹', ambienceTags: ['Family Dining'] },
    { name: 'Palm Shore', cuisine: 'Seafood', location: 'OMR', priceRange: '₹₹', ambienceTags: ['Outdoor Seating'] },
    { name: 'Annalakshmi', cuisine: 'Vegetarian', location: 'Egmore', priceRange: '₹₹₹', ambienceTags: ['Family Dining', 'Luxury Dining'] },
    { name: 'Southern Spice', cuisine: 'South Indian', location: 'Guindy', priceRange: '₹₹₹₹', ambienceTags: ['Luxury Dining'] },
    { name: 'The Marina', cuisine: 'Seafood', location: 'Nungambakkam', priceRange: '₹₹₹', ambienceTags: ['Romantic', 'Rooftop'] },
    { name: 'Dakshin', cuisine: 'South Indian', location: 'Mylapore', priceRange: '₹₹₹₹', ambienceTags: ['Luxury Dining', 'Live Music'] },
    { name: 'Copper Kitchen', cuisine: 'North Indian', location: 'Velachery', priceRange: '₹₹', ambienceTags: ['Family Dining'] },
    { name: 'Barbeque Nation', cuisine: 'Multi Cuisine', location: 'T Nagar', priceRange: '₹₹₹', ambienceTags: ['Family Dining', 'Live Music'] },
    { name: 'Absolute Barbecue', cuisine: 'Multi Cuisine', location: 'Velachery', priceRange: '₹₹₹', ambienceTags: ['Family Dining'] },
    { name: 'Coal Barbecues', cuisine: 'Multi Cuisine', location: 'Anna Nagar', priceRange: '₹₹₹', ambienceTags: ['Family Dining'] },
    { name: 'Madras Pavilion', cuisine: 'Multi Cuisine', location: 'Guindy', priceRange: '₹₹₹₹', ambienceTags: ['Luxury Dining'] },
    { name: 'Bay View', cuisine: 'Seafood', location: 'Besant Nagar', priceRange: '₹₹₹', ambienceTags: ['Romantic', 'Rooftop', 'Outdoor Seating'] },
    { name: 'Sunset Grill', cuisine: 'Multi Cuisine', location: 'Velachery', priceRange: '₹₹₹', ambienceTags: ['Romantic', 'Rooftop'] },
    { name: 'French Royale', cuisine: 'Modern Indian', location: 'Anna Nagar', priceRange: '₹₹₹₹', ambienceTags: ['Luxury Dining', 'Romantic'] },
    { name: 'The Flying Elephant', cuisine: 'Multi Cuisine', location: 'Guindy', priceRange: '₹₹₹₹', ambienceTags: ['Luxury Dining', 'Live Music'] },
    { name: 'The Reef', cuisine: 'Multi Cuisine', location: 'OMR', priceRange: '₹₹₹', ambienceTags: ['Family Dining', 'Outdoor Seating'] },
    { name: 'Sangeetha Veg Restaurant', cuisine: 'Vegetarian', location: 'Mylapore', priceRange: '₹', ambienceTags: ['Family Dining'] },
    { name: 'Murugan Idli Shop', cuisine: 'South Indian', location: 'T Nagar', priceRange: '₹', ambienceTags: ['Family Dining'] },
    { name: 'Kumarakom', cuisine: 'South Indian', location: 'Velachery', priceRange: '₹₹', ambienceTags: ['Family Dining'] },
    { name: 'A2B - OMR', cuisine: 'Vegetarian', location: 'OMR', priceRange: '₹', ambienceTags: ['Family Dining'] },
    { name: 'Ponnusamy', cuisine: 'South Indian', location: 'Egmore', priceRange: '₹₹', ambienceTags: ['Heritage'] },
    { name: 'Dindigul Thalappakatti', cuisine: 'South Indian', location: 'Adyar', priceRange: '₹₹', ambienceTags: ['Classic'] },
    { name: 'Savya Rasa', cuisine: 'South Indian', location: 'Kotturpuram', priceRange: '₹₹₹', ambienceTags: ['Cultural'] },
    { name: 'The Pasta Bar Veneto', cuisine: 'Italian', location: 'T Nagar', priceRange: '₹₹', ambienceTags: ['Cozy'] },
    { name: 'Tuscana Pizzeria', cuisine: 'Italian', location: 'Nungambakkam', priceRange: '₹₹₹', ambienceTags: ['Authentic'] },
    { name: 'Ottimo', cuisine: 'Italian', location: 'Guindy', priceRange: '₹₹₹₹', ambienceTags: ['Luxury Dining'] },
    { name: 'Prego', cuisine: 'Italian', location: 'Nungambakkam', priceRange: '₹₹₹₹', ambienceTags: ['Fine Dining'] },
    { name: 'Mekong', cuisine: 'Asian', location: 'Pallavaram', priceRange: '₹₹₹', ambienceTags: ['Elegant'] },
    { name: 'Pan Asian', cuisine: 'Asian', location: 'Guindy', priceRange: '₹₹₹₹', ambienceTags: ['Oriental'] },
    { name: 'China Town', cuisine: 'Asian', location: 'Egmore', priceRange: '₹₹', ambienceTags: ['Simple'] },
    { name: 'Mainland China', cuisine: 'Asian', location: 'Nungambakkam', priceRange: '₹₹₹', ambienceTags: ['Classic'] },
    { name: 'Benjarong', cuisine: 'Asian', location: 'Alwarpet', priceRange: '₹₹₹', ambienceTags: ['Thai Heritage'] },
    { name: 'Chap Chay', cuisine: 'Asian', location: 'Alwarpet', priceRange: '₹₹₹', ambienceTags: ['Stir Fry'] },
    { name: 'Up North', cuisine: 'North Indian', location: 'Nungambakkam', priceRange: '₹₹₹', ambienceTags: ['Rooftop'] },
    { name: 'Peshawri', cuisine: 'North Indian', location: 'Guindy', priceRange: '₹₹₹₹', ambienceTags: ['Rustic Luxury'] },
    { name: 'Bombay Brasserie', cuisine: 'North Indian', location: 'Adyar', priceRange: '₹₹₹', ambienceTags: ['Vintage'] },
    { name: 'Moti Mahal', cuisine: 'North Indian', location: 'T Nagar', priceRange: '₹₹', ambienceTags: ['Iconic'] },
    { name: 'Great Kabab Factory', cuisine: 'North Indian', location: 'GST Road', priceRange: '₹₹₹', ambienceTags: ['Platter Style'] },
    { name: 'Sukuu Thai', cuisine: 'Asian', location: 'T Nagar', priceRange: '₹₹₹', ambienceTags: ['Authentic Thai'] },
    { name: 'The Farm', cuisine: 'Multi Cuisine', location: 'Semmancheri', priceRange: '₹₹₹', ambienceTags: ['Farm to Table'] },
    { name: 'Ente Keralam', cuisine: 'South Indian', location: 'Poes Garden', priceRange: '₹₹₹', ambienceTags: ['Kerala Heritage'] },
    { name: 'Kobe Sizzlers', cuisine: 'Multi Cuisine', location: 'Nungambakkam', priceRange: '₹₹', ambienceTags: ['Sizzling'] },
    { name: 'Little Italy', cuisine: 'Italian', location: 'Besant Nagar', priceRange: '₹₹₹', ambienceTags: ['Veg Italian'] },
    { name: 'Cream Centre', cuisine: 'Multi Cuisine', location: 'Mylapore', priceRange: '₹₹', ambienceTags: ['Veg Paradise'] },
    { name: 'New Yorker', cuisine: 'Multi Cuisine', location: 'Mylapore', priceRange: '₹₹', ambienceTags: ['Casual'] },
    { name: 'Eden', cuisine: 'Multi Cuisine', location: 'Nungambakkam', priceRange: '₹₹', ambienceTags: ['Vintage Veg'] },
    { name: 'Soy Soi', cuisine: 'Asian', location: 'Kotturpuram', priceRange: '₹₹₹', ambienceTags: ['Street Food Style'] },
    { name: 'Mamagoto', cuisine: 'Asian', location: 'Nungambakkam', priceRange: '₹₹₹', ambienceTags: ['Fun Dining'] },
    { name: 'Sera - The Tapas Bar', cuisine: 'Multi Cuisine', location: 'Gopalapuram', priceRange: '₹₹₹', ambienceTags: ['Spanish Vibe'] },
    { name: 'The Leather Bar', cuisine: 'Multi Cuisine', location: 'Nungambakkam', priceRange: '₹₹₹₹', ambienceTags: ['Lounge'] },
    { name: 'Q Bar', cuisine: 'Multi Cuisine', location: 'Guindy', priceRange: '₹₹₹₹', ambienceTags: ['Rooftop Luxury'] },
    { name: 'Library Blu', cuisine: 'Multi Cuisine', location: 'Nungambakkam', priceRange: '₹₹₹₹', ambienceTags: ['Elegant Lounge'] },
    { name: 'Broken Bridge Cafe', cuisine: 'Modern Indian', location: 'Santhome', priceRange: '₹₹', ambienceTags: ['Artistic'] },
    { name: 'Radio Room', cuisine: 'Multi Cuisine', location: 'Adyar', priceRange: '₹₹₹', ambienceTags: ['Vibrant'] }
];

const TESTIMONIALS = [
    { name: 'Arjun Menon', location: 'Chennai', content: 'Booking through Reserve was effortless. The restaurant we discovered exceeded our expectations.', rating: 5, image: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { name: 'Priya Sharma', location: 'Bangalore', content: 'The birthday experience package was incredible. Everything was perfectly arranged.', rating: 5, image: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { name: 'Rohan Kapoor', location: 'Mumbai', content: 'Reserve makes discovering premium restaurants easy and elegant.', rating: 5, image: 'https://randomuser.me/api/portraits/men/12.jpg' },
    { name: 'Sanjana Iyer', location: 'Chennai', content: 'The interface is beautiful and the booking system is incredibly smooth.', rating: 5, image: 'https://randomuser.me/api/portraits/women/21.jpg' },
    { name: 'Rahul Verma', location: 'Delhi', content: 'This platform feels like a luxury concierge service for dining.', rating: 5, image: 'https://randomuser.me/api/portraits/men/45.jpg' },
    { name: 'Aditya Narayan', location: 'Hyderabad', content: 'Real time slots and instant confirmation makes this platform trustworthy.', rating: 5, image: 'https://randomuser.me/api/portraits/men/52.jpg' },
    { name: 'Kavya Reddy', location: 'Chennai', content: 'Reserve helped us find amazing restaurants we would never have discovered.', rating: 5, image: 'https://randomuser.me/api/portraits/women/33.jpg' },
    { name: 'Vikram Patel', location: 'Ahmedabad', content: 'Elegant design and seamless reservations. Absolutely love this platform.', rating: 5, image: 'https://randomuser.me/api/portraits/men/62.jpg' },
    { name: 'Neha Gupta', location: 'Pune', content: 'The curated restaurant selection is amazing.', rating: 5, image: 'https://randomuser.me/api/portraits/women/28.jpg' },
    { name: 'Daniel Joseph', location: 'Chennai', content: 'Reserve feels like the OpenTable of India.', rating: 5, image: 'https://randomuser.me/api/portraits/men/38.jpg' },
    { name: 'Tanya Singh', location: 'Delhi', content: 'A fantastic way to book premium restaurants.', rating: 5, image: 'https://randomuser.me/api/portraits/women/55.jpg' },
    { name: 'Mohit Sharma', location: 'Bangalore', content: 'Excellent platform with a luxury feel.', rating: 5, image: 'https://randomuser.me/api/portraits/men/22.jpg' }
];

const populateAll = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        // 1. Get or Create System Owner
        let systemOwner = await User.findOne({ email: 'owner@reserve.com' });
        if (!systemOwner) {
            systemOwner = new User({
                name: 'RESERVE Partner',
                email: 'owner@reserve.com',
                password: 'Password123!',
                role: 'owner',
                isVerified: true
            });
            await systemOwner.save();
            console.log('Created System Owner account.');
        }

        // 2. Clear legacy data
        console.log('Clearing legacy menu fields and existing testimonials...');
        await Restaurant.updateMany({}, { $unset: { menu: "" } });
        await Testimonial.deleteMany({});

        // 3. Create Testimonials
        console.log('Creating Testimonials...');
        await Testimonial.insertMany(TESTIMONIALS);

        // 4. Ensure 55 Restaurants
        console.log(`Processing ${CHENNAI_RESTAURANTS.length} restaurants...`);
        for (const data of CHENNAI_RESTAURANTS) {
            let res = await Restaurant.findOne({ name: data.name });
            if (!res) {
                res = new Restaurant({
                    ...data,
                    ownerId: systemOwner._id,
                    isApproved: true,
                    city: 'Chennai',
                    subscriptionStatus: 'active',
                    subscriptionExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                });
                await res.save();
                console.log(`Created: ${data.name}`);
            }

            // 5. Populate detailed data
            await restaurantService.populateRestaurantData(res._id);
        }

        console.log('Data population complete for 55+ restaurants and 10 testimonials.');
        process.exit(0);
    } catch (error) {
        console.error('Error during population:', error);
        process.exit(1);
    }
};

populateAll();
