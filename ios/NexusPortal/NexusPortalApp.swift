import SwiftUI

@main
struct NexusPortalApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        PortalWebView()
            .background(Color(red: 0.957, green: 0.965, blue: 0.976))
    }
}
