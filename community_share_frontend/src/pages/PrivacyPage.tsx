import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage({ onBack }: { onBack?: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-2xl mx-auto pb-20">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      )}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Privacy Policy</h1>
      <div className="prose prose-sm text-gray-700 space-y-4">
        <p className="text-xs text-gray-400">Last updated: March 29, 2026</p>

        <h2 className="text-lg font-semibold text-gray-800">1. Introduction</h2>
        <p>ViciLend ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our application.</p>

        <h2 className="text-lg font-semibold text-gray-800">2. Information We Collect</h2>
        <h3 className="text-md font-medium text-gray-700">Information you provide:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Account information</strong> — name, email address, password (stored encrypted), and optional phone number</li>
          <li><strong>Profile information</strong> — profile photo and bio</li>
          <li><strong>Listing information</strong> — item/service titles, descriptions, photos, and pricing</li>
          <li><strong>Messages</strong> — direct messages between users</li>
          <li><strong>Reviews</strong> — ratings and comments you leave for other users</li>
          <li><strong>Community information</strong> — community memberships and discussion posts</li>
        </ul>

        <h3 className="text-md font-medium text-gray-700">Information collected automatically:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Usage data</strong> — pages visited and features used</li>
          <li><strong>Device information</strong> — browser type, operating system</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-800">3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide and maintain the Service</li>
          <li>Enable communication between community members</li>
          <li>Facilitate item rentals and service bookings</li>
          <li>Display user profiles, listings, and reviews to other community members</li>
          <li>Send important account and service notifications</li>
          <li>Improve and develop new features</li>
          <li>Ensure security and prevent fraud</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-800">4. Information Sharing</h2>
        <p>We share your information only in these limited circumstances:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>With community members</strong> — your name, profile photo, ratings, listings, and discussion posts are visible to members of your communities</li>
          <li><strong>With transaction partners</strong> — when you rent an item or book a service, relevant contact information is shared with the other party</li>
          <li><strong>For legal compliance</strong> — when required by law or to protect our rights</li>
        </ul>
        <p>We do <strong>not</strong> sell your personal information to third parties.</p>

        <h2 className="text-lg font-semibold text-gray-800">5. Data Storage and Security</h2>
        <p>Your data is stored on secure servers. We use industry-standard security measures including:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Encrypted password storage (bcrypt hashing)</li>
          <li>JWT-based authentication tokens</li>
          <li>HTTPS encryption for all data in transit</li>
        </ul>
        <p>While we take reasonable precautions, no method of electronic storage is 100% secure. We cannot guarantee absolute security.</p>

        <h2 className="text-lg font-semibold text-gray-800">6. Your Rights</h2>
        <p>You have the right to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Access</strong> your personal data through your profile page</li>
          <li><strong>Update</strong> your profile information at any time</li>
          <li><strong>Delete</strong> your account and associated data by contacting us</li>
          <li><strong>Opt out</strong> of non-essential communications</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-800">7. Photos and Media</h2>
        <p>Photos you upload (profile pictures, item photos) are stored on our servers and are visible to members of your communities. You can remove photos at any time by editing your profile or listings.</p>

        <h2 className="text-lg font-semibold text-gray-800">8. Children's Privacy</h2>
        <p>The Service is not intended for users under the age of 18. We do not knowingly collect information from children under 18.</p>

        <h2 className="text-lg font-semibold text-gray-800">9. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. We will notify users of significant changes through the Service. Continued use after changes constitutes acceptance of the updated policy.</p>

        <h2 className="text-lg font-semibold text-gray-800">10. Contact Us</h2>
        <p>For questions about this Privacy Policy or your personal data, please contact us through the app's messaging feature or reach out to your community administrator.</p>
      </div>
    </div>
  );
}
