import SwiftUI
import WebKit

/// Hosts the self-contained Nexus Portal web app from the bundle.
/// localStorage persists per-app, so sessions and demo data survive relaunches.
struct PortalWebView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.defaultWebpagePreferences.allowsContentJavaScript = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.957, green: 0.965, blue: 0.976, alpha: 1)

        // Safari Web Inspector (Develop menu) for debugging
        if #available(iOS 16.4, *) {
            webView.isInspectable = true
        }

        if let url = Bundle.main.url(forResource: "nexus-portal", withExtension: "html") {
            webView.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
        }
        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}
