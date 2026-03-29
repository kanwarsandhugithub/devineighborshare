import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage({ onBack }: { onBack?: () => void }) {
  return (
    <div className="min-h-screen bg-gray-50 p-4 max-w-2xl mx-auto pb-20">
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      )}
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Terms of Service</h1>
      <div className="prose prose-sm text-gray-700 space-y-4">
        <p className="text-xs text-gray-400">Last updated: March 29, 2026</p>

        <h2 className="text-lg font-semibold text-gray-800">1. Acceptance of Terms</h2>
        <p>By accessing or using the NeighborShare application ("Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>

        <h2 className="text-lg font-semibold text-gray-800">2. Description of Service</h2>
        <p>NeighborShare is a community-based platform that enables residents within HOA and apartment communities to share, rent, and offer items and services to their neighbors. The Service facilitates connections between community members but does not own, manage, or control any items or services listed.</p>

        <h2 className="text-lg font-semibold text-gray-800">3. User Accounts</h2>
        <p>You must register for an account to use the Service. You agree to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide accurate and complete information during registration</li>
          <li>Maintain the security of your account credentials</li>
          <li>Be responsible for all activity under your account</li>
          <li>Notify us immediately of any unauthorized use of your account</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-800">4. Community Membership</h2>
        <p>Access to community features requires joining a community using a valid join code. You agree to only join communities you are legitimately a part of (e.g., your HOA, apartment building, or neighborhood).</p>

        <h2 className="text-lg font-semibold text-gray-800">5. Listings and Transactions</h2>
        <p>When listing items or services, you agree to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide accurate descriptions and fair pricing</li>
          <li>Only list items you own and have the right to rent or share</li>
          <li>Respond to rental requests and booking inquiries in a timely manner</li>
          <li>Honor approved rental agreements and service bookings</li>
          <li>Return borrowed items in the same condition they were received</li>
        </ul>
        <p>NeighborShare is not a party to any transaction between users. All agreements, payments, and disputes are between the users involved.</p>

        <h2 className="text-lg font-semibold text-gray-800">6. User Conduct</h2>
        <p>You agree not to:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Use the Service for any illegal or unauthorized purpose</li>
          <li>Post false, misleading, or fraudulent listings</li>
          <li>Harass, threaten, or abuse other users</li>
          <li>Upload content that is offensive, harmful, or violates others' rights</li>
          <li>Attempt to access other users' accounts or private data</li>
          <li>Use the Service to spam or send unsolicited messages</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-800">7. Ratings and Reviews</h2>
        <p>Users may leave ratings and reviews after completing transactions. Reviews must be honest and based on genuine experiences. We reserve the right to remove reviews that violate these terms.</p>

        <h2 className="text-lg font-semibold text-gray-800">8. Content Ownership</h2>
        <p>You retain ownership of content you post (photos, descriptions, messages). By posting content, you grant NeighborShare a non-exclusive license to display it within the Service.</p>

        <h2 className="text-lg font-semibold text-gray-800">9. Limitation of Liability</h2>
        <p>NeighborShare is provided "as is" without warranties of any kind. We are not responsible for:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>The quality, safety, or legality of items or services listed</li>
          <li>The accuracy of listings or user profiles</li>
          <li>Damage to or loss of rented items</li>
          <li>Any disputes between users</li>
          <li>Any injuries or damages resulting from transactions</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-800">10. Termination</h2>
        <p>We reserve the right to suspend or terminate your account at any time for violations of these terms. You may also delete your account at any time by contacting us.</p>

        <h2 className="text-lg font-semibold text-gray-800">11. Changes to Terms</h2>
        <p>We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the updated Terms.</p>

        <h2 className="text-lg font-semibold text-gray-800">12. Contact</h2>
        <p>For questions about these Terms, please contact us through the app's messaging feature or reach out to your community administrator.</p>
      </div>
    </div>
  );
}
