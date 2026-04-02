import Testing
@testable import Wildvine

@Suite(.serialized)
@MainActor
struct OnboardingCoverageTests {
    @Test func `exercise onboarding pages`() {
        OnboardingView.exerciseForTesting()
    }
}
