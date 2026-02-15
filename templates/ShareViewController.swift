import AVFoundation
import MobileCoreServices
import UIKit
import UniformTypeIdentifiers

// MARK: - Data Models

struct ShareChat: Codable {
  let id: Int
  let name: String
  let type: String
  let avatar: String?
  let last_message_content: String?
  let last_message_time: String?
}

struct ProcessedFile {
  let localURL: URL
  let fileName: String
  let mimeType: String
  let fileSize: Int?
}

enum ShareError: Error, LocalizedError {
  case noAuth
  case sessionExpired
  case uploadFailed(Int)
  case sendFailed(Int)
  case networkError(Error)

  var errorDescription: String? {
    switch self {
    case .noAuth: return "Не авторизован"
    case .sessionExpired: return "Сессия истекла. Откройте Тахион и войдите снова"
    case .uploadFailed(let code): return "Ошибка загрузки файла (код \(code))"
    case .sendFailed(let code): return "Ошибка отправки (код \(code))"
    case .networkError(let err): return "Ошибка сети: \(err.localizedDescription)"
    }
  }
}

// MARK: - ShareViewController

class ShareViewController: UIViewController {

  // MARK: Config (replaced by config plugin)
  let appGroupIdentifier = "<GROUPIDENTIFIER>"
  let shareScheme = "<SCHEME>"

  // MARK: Content type identifiers
  let imageContentType = UTType.image.identifier
  let videoContentType = UTType.movie.identifier
  let textContentType = UTType.text.identifier
  let urlContentType = UTType.url.identifier
  let propertyListType = UTType.propertyList.identifier
  let fileURLType = UTType.fileURL.identifier
  let pkpassContentType = "com.apple.pkpass"
  let pdfContentType = UTType.pdf.identifier
  let vcardContentType = "public.vcard"

  // MARK: Data
  private var allChats: [ShareChat] = []
  private var filteredChats: [ShareChat] = []
  private var sessionId: String?
  private var apiBaseUrl: String?
  private var currentUserId: Int?

  private var processedFiles: [ProcessedFile] = []
  private var processedTexts: [String] = []
  private var processedUrls: [String] = []
  private var isContentReady = false
  private var selectedChatId: Int?
  private var isSending = false

  // MARK: Avatar cache
  private var avatarCache: [String: UIImage] = [:]

  // MARK: UI Elements
  private let navBar = UIView()
  private let titleLabel = UILabel()
  private let cancelButton = UIButton(type: .system)
  private let previewContainer = UIView()
  private let previewIcon = UIImageView()
  private let previewLabel = UILabel()
  private let searchBar = UISearchBar()
  private let tableView = UITableView()
  private let statusOverlay = UIView()
  private let statusSpinner = UIActivityIndicatorView(style: .large)
  private let statusLabel = UILabel()
  private let statusIcon = UIImageView()
  private let emptyLabel = UILabel()

  // MARK: - Lifecycle

  override func viewDidLoad() {
    super.viewDidLoad()
    setupUI()
    loadSyncedData()
    processSharedContent()
  }

  // MARK: - UI Setup

  private func setupUI() {
    view.backgroundColor = .systemBackground

    // Nav bar
    navBar.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(navBar)

    let separator = UIView()
    separator.backgroundColor = .separator
    separator.translatesAutoresizingMaskIntoConstraints = false
    navBar.addSubview(separator)

    titleLabel.text = "Отправить в чат"
    titleLabel.font = .systemFont(ofSize: 17, weight: .semibold)
    titleLabel.translatesAutoresizingMaskIntoConstraints = false
    navBar.addSubview(titleLabel)

    cancelButton.setTitle("Отмена", for: .normal)
    cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
    cancelButton.translatesAutoresizingMaskIntoConstraints = false
    navBar.addSubview(cancelButton)

    // Preview container
    previewContainer.backgroundColor = .secondarySystemBackground
    previewContainer.layer.cornerRadius = 10
    previewContainer.clipsToBounds = true
    previewContainer.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(previewContainer)

    previewIcon.tintColor = .secondaryLabel
    previewIcon.contentMode = .scaleAspectFit
    previewIcon.translatesAutoresizingMaskIntoConstraints = false
    previewContainer.addSubview(previewIcon)

    previewLabel.font = .systemFont(ofSize: 13)
    previewLabel.textColor = .secondaryLabel
    previewLabel.numberOfLines = 2
    previewLabel.lineBreakMode = .byTruncatingTail
    previewLabel.text = "Обработка..."
    previewLabel.translatesAutoresizingMaskIntoConstraints = false
    previewContainer.addSubview(previewLabel)

    // Search bar
    searchBar.placeholder = "Поиск чатов..."
    searchBar.delegate = self
    searchBar.searchBarStyle = .minimal
    searchBar.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(searchBar)

    // Table view
    tableView.register(ChatCell.self, forCellReuseIdentifier: "ChatCell")
    tableView.dataSource = self
    tableView.delegate = self
    tableView.rowHeight = 60
    tableView.separatorInset = UIEdgeInsets(top: 0, left: 68, bottom: 0, right: 0)
    tableView.keyboardDismissMode = .onDrag
    tableView.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(tableView)

    // Empty label
    emptyLabel.text = "Нет чатов"
    emptyLabel.textColor = .secondaryLabel
    emptyLabel.font = .systemFont(ofSize: 15)
    emptyLabel.textAlignment = .center
    emptyLabel.isHidden = true
    emptyLabel.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(emptyLabel)

    // Status overlay
    statusOverlay.backgroundColor = UIColor.systemBackground.withAlphaComponent(0.95)
    statusOverlay.isHidden = true
    statusOverlay.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(statusOverlay)

    statusSpinner.translatesAutoresizingMaskIntoConstraints = false
    statusOverlay.addSubview(statusSpinner)

    statusIcon.translatesAutoresizingMaskIntoConstraints = false
    statusIcon.contentMode = .scaleAspectFit
    statusIcon.isHidden = true
    statusOverlay.addSubview(statusIcon)

    statusLabel.font = .systemFont(ofSize: 15)
    statusLabel.textColor = .label
    statusLabel.textAlignment = .center
    statusLabel.numberOfLines = 0
    statusLabel.translatesAutoresizingMaskIntoConstraints = false
    statusOverlay.addSubview(statusLabel)

    // Layout
    NSLayoutConstraint.activate([
      navBar.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
      navBar.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      navBar.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      navBar.heightAnchor.constraint(equalToConstant: 44),

      separator.leadingAnchor.constraint(equalTo: navBar.leadingAnchor),
      separator.trailingAnchor.constraint(equalTo: navBar.trailingAnchor),
      separator.bottomAnchor.constraint(equalTo: navBar.bottomAnchor),
      separator.heightAnchor.constraint(equalToConstant: 0.5),

      titleLabel.centerXAnchor.constraint(equalTo: navBar.centerXAnchor),
      titleLabel.centerYAnchor.constraint(equalTo: navBar.centerYAnchor),

      cancelButton.trailingAnchor.constraint(equalTo: navBar.trailingAnchor, constant: -16),
      cancelButton.centerYAnchor.constraint(equalTo: navBar.centerYAnchor),

      previewContainer.topAnchor.constraint(equalTo: navBar.bottomAnchor, constant: 12),
      previewContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
      previewContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
      previewContainer.heightAnchor.constraint(equalToConstant: 44),

      previewIcon.leadingAnchor.constraint(equalTo: previewContainer.leadingAnchor, constant: 12),
      previewIcon.centerYAnchor.constraint(equalTo: previewContainer.centerYAnchor),
      previewIcon.widthAnchor.constraint(equalToConstant: 20),
      previewIcon.heightAnchor.constraint(equalToConstant: 20),

      previewLabel.leadingAnchor.constraint(equalTo: previewIcon.trailingAnchor, constant: 8),
      previewLabel.trailingAnchor.constraint(equalTo: previewContainer.trailingAnchor, constant: -12),
      previewLabel.centerYAnchor.constraint(equalTo: previewContainer.centerYAnchor),

      searchBar.topAnchor.constraint(equalTo: previewContainer.bottomAnchor, constant: 4),
      searchBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
      searchBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -8),

      tableView.topAnchor.constraint(equalTo: searchBar.bottomAnchor),
      tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),

      emptyLabel.centerXAnchor.constraint(equalTo: tableView.centerXAnchor),
      emptyLabel.centerYAnchor.constraint(equalTo: tableView.centerYAnchor),

      statusOverlay.topAnchor.constraint(equalTo: navBar.bottomAnchor),
      statusOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      statusOverlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      statusOverlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),

      statusSpinner.centerXAnchor.constraint(equalTo: statusOverlay.centerXAnchor),
      statusSpinner.centerYAnchor.constraint(equalTo: statusOverlay.centerYAnchor, constant: -20),

      statusIcon.centerXAnchor.constraint(equalTo: statusOverlay.centerXAnchor),
      statusIcon.centerYAnchor.constraint(equalTo: statusOverlay.centerYAnchor, constant: -20),
      statusIcon.widthAnchor.constraint(equalToConstant: 48),
      statusIcon.heightAnchor.constraint(equalToConstant: 48),

      statusLabel.topAnchor.constraint(equalTo: statusSpinner.bottomAnchor, constant: 16),
      statusLabel.leadingAnchor.constraint(equalTo: statusOverlay.leadingAnchor, constant: 32),
      statusLabel.trailingAnchor.constraint(equalTo: statusOverlay.trailingAnchor, constant: -32),
    ])
  }

  // MARK: - Load Synced Data

  private func loadSyncedData() {
    NSLog("[ShareExt] loadSyncedData — appGroupIdentifier=%@", appGroupIdentifier)

    guard let defaults = UserDefaults(suiteName: appGroupIdentifier) else {
      NSLog("[ShareExt] ERROR: UserDefaults(suiteName:) returned nil — App Group '%@' not configured in provisioning profile", appGroupIdentifier)
      showError("Ошибка конфигурации App Group. Пересоберите приложение")
      return
    }

    sessionId = defaults.string(forKey: "shareExtension_sessionId")
    currentUserId = defaults.integer(forKey: "shareExtension_userId")
    apiBaseUrl = defaults.string(forKey: "shareExtension_apiBaseUrl")

    NSLog("[ShareExt] Read from UserDefaults — sessionId=%@, userId=%d, apiBaseUrl=%@",
          sessionId ?? "nil", currentUserId ?? 0, apiBaseUrl ?? "nil")

    if let chatsJson = defaults.string(forKey: "shareExtension_chats"),
      let data = chatsJson.data(using: .utf8)
    {
      allChats = (try? JSONDecoder().decode([ShareChat].self, from: data)) ?? []
    }

    NSLog("[ShareExt] Loaded %d chats from shared storage", allChats.count)

    filteredChats = allChats

    if sessionId == nil {
      NSLog("[ShareExt] No session found — showing auth error")
      showError("Войдите в приложение Тахион для отправки")
      return
    }

    if allChats.isEmpty {
      fetchChatsFromAPI()
    } else {
      updateEmptyState()
      tableView.reloadData()
    }
  }

  // MARK: - Fetch Chats Fallback

  private func fetchChatsFromAPI() {
    guard let baseUrl = apiBaseUrl, let session = sessionId else { return }

    showLoading("Загрузка чатов...")

    guard let url = URL(string: "\(baseUrl)/chats/?limit=50&offset=0") else { return }

    var request = URLRequest(url: url)
    request.httpMethod = "GET"
    request.setValue(session, forHTTPHeaderField: "X-Session-ID")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
      DispatchQueue.main.async {
        self?.hideLoading()

        if let error = error {
          self?.showError("Ошибка сети: \(error.localizedDescription)")
          return
        }

        let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
        if statusCode == 401 {
          self?.showError("Сессия истекла. Откройте Тахион и войдите снова")
          return
        }

        guard let data = data,
          let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
          let chatsArray = json["chats"] as? [[String: Any]]
        else {
          self?.showError("Ошибка загрузки чатов")
          return
        }

        self?.allChats = chatsArray.compactMap { dict in
          guard let id = dict["id"] as? Int else { return nil }
          let name = dict["name"] as? String ?? "Без названия"
          let type = dict["type"] as? String ?? "private"
          let avatar = dict["avatar"] as? String
          let lastMsg = (dict["last_message"] as? [String: Any])?["content"] as? String
          let lastMsgTime = (dict["last_message"] as? [String: Any])?["created_at"] as? String
          return ShareChat(
            id: id, name: name, type: type, avatar: avatar,
            last_message_content: lastMsg, last_message_time: lastMsgTime)
        }
        self?.filteredChats = self?.allChats ?? []
        self?.updateEmptyState()
        self?.tableView.reloadData()
      }
    }.resume()
  }

  // MARK: - Content Processing

  private func processSharedContent() {
    guard let extensionContext = self.extensionContext,
      let content = extensionContext.inputItems.first as? NSExtensionItem,
      let attachments = content.attachments, !attachments.isEmpty
    else {
      previewLabel.text = "Нет контента"
      previewIcon.image = UIImage(systemName: "exclamationmark.triangle")
      isContentReady = true
      return
    }

    let totalCount = attachments.count
    var processedCount = 0

    for attachment in attachments {
      Task {
        if attachment.hasItemConformingToTypeIdentifier(imageContentType) {
          await handleImage(attachment: attachment)
        } else if attachment.hasItemConformingToTypeIdentifier(videoContentType) {
          await handleVideo(attachment: attachment)
        } else if attachment.hasItemConformingToTypeIdentifier(vcardContentType) {
          await handleGenericFile(attachment: attachment, typeIdentifier: vcardContentType, fallbackExt: "vcf")
        } else if attachment.hasItemConformingToTypeIdentifier(fileURLType) {
          await handleGenericFile(attachment: attachment, typeIdentifier: fileURLType, fallbackExt: "bin")
        } else if attachment.hasItemConformingToTypeIdentifier(pkpassContentType) {
          await handleGenericFile(attachment: attachment, typeIdentifier: pkpassContentType, fallbackExt: "pkpass")
        } else if attachment.hasItemConformingToTypeIdentifier(pdfContentType) {
          await handleGenericFile(attachment: attachment, typeIdentifier: pdfContentType, fallbackExt: "pdf")
        } else if attachment.hasItemConformingToTypeIdentifier(propertyListType) {
          await handlePreprocessing(attachment: attachment)
        } else if attachment.hasItemConformingToTypeIdentifier(urlContentType) {
          await handleURL(attachment: attachment)
        } else if attachment.hasItemConformingToTypeIdentifier(textContentType) {
          await handleText(attachment: attachment)
        }

        processedCount += 1
        if processedCount == totalCount {
          await MainActor.run {
            self.isContentReady = true
            self.updatePreview()
          }
        }
      }
    }
  }

  @MainActor
  private func handleImage(attachment: NSItemProvider) async {
    do {
      let item = try await attachment.loadItem(forTypeIdentifier: imageContentType)

      var url: URL?
      if let dataURL = item as? URL {
        url = dataURL
      } else if let image = item as? UIImage {
        url = saveImageToContainer(image)
      } else if let data = item as? Data, let image = UIImage(data: data) {
        url = saveImageToContainer(image)
      }

      guard let sourceURL = url else { return }

      let ext = getExtension(from: sourceURL, type: .image)
      let fileName = getFileName(from: sourceURL, type: .image)
      let fileSize = getFileSize(from: sourceURL)
      let mimeType = sourceURL.mimeType(ext: ext)

      let newName = "\(UUID().uuidString).\(ext)"
      let destURL = containerURL().appendingPathComponent(newName)

      if copyFile(at: sourceURL, to: destURL) {
        processedFiles.append(
          ProcessedFile(localURL: destURL, fileName: fileName, mimeType: mimeType, fileSize: fileSize)
        )
      }
    } catch {
      NSLog("[ShareExt] Error processing image: \(error)")
    }
  }

  @MainActor
  private func handleVideo(attachment: NSItemProvider) async {
    do {
      guard
        let url = try await attachment.loadItem(forTypeIdentifier: videoContentType) as? URL
      else { return }

      let ext = getExtension(from: url, type: .video)
      let fileName = getFileName(from: url, type: .video)
      let fileSize = getFileSize(from: url)
      let mimeType = url.mimeType(ext: ext)

      let newName = "\(UUID().uuidString).\(ext)"
      let destURL = containerURL().appendingPathComponent(newName)

      if copyFile(at: url, to: destURL) {
        processedFiles.append(
          ProcessedFile(localURL: destURL, fileName: fileName, mimeType: mimeType, fileSize: fileSize)
        )
      }
    } catch {
      NSLog("[ShareExt] Error processing video: \(error)")
    }
  }

  @MainActor
  private func handleGenericFile(attachment: NSItemProvider, typeIdentifier: String, fallbackExt: String) async {
    do {
      var sourceURL: URL?

      if let url = try await attachment.loadItem(forTypeIdentifier: typeIdentifier) as? URL {
        sourceURL = url
      } else if let data = try await attachment.loadItem(forTypeIdentifier: typeIdentifier) as? Data {
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(
          "\(UUID().uuidString).\(fallbackExt)")
        try data.write(to: tmp)
        sourceURL = tmp
      }

      guard let url = sourceURL else { return }

      let ext = getExtension(from: url, type: .file)
      let fileName = getFileName(from: url, type: .file)
      let fileSize = getFileSize(from: url)
      let mimeType = url.mimeType(ext: ext)

      let newName = "\(UUID().uuidString).\(ext)"
      let destURL = containerURL().appendingPathComponent(newName)

      if copyFile(at: url, to: destURL) {
        processedFiles.append(
          ProcessedFile(localURL: destURL, fileName: fileName, mimeType: mimeType, fileSize: fileSize)
        )
      }
    } catch {
      NSLog("[ShareExt] Error processing file: \(error)")
    }
  }

  @MainActor
  private func handleText(attachment: NSItemProvider) async {
    do {
      if let text = try await attachment.loadItem(forTypeIdentifier: textContentType) as? String {
        processedTexts.append(text)
      }
    } catch {
      NSLog("[ShareExt] Error processing text: \(error)")
    }
  }

  @MainActor
  private func handleURL(attachment: NSItemProvider) async {
    do {
      if let url = try await attachment.loadItem(forTypeIdentifier: urlContentType) as? URL {
        processedUrls.append(url.absoluteString)
      }
    } catch {
      NSLog("[ShareExt] Error processing URL: \(error)")
    }
  }

  @MainActor
  private func handlePreprocessing(attachment: NSItemProvider) async {
    do {
      if let item = try await attachment.loadItem(forTypeIdentifier: propertyListType)
        as? NSDictionary,
        let results = item[NSExtensionJavaScriptPreprocessingResultsKey] as? NSDictionary,
        let url = results["baseURI"] as? String
      {
        processedUrls.append(url)
      }
    } catch {
      NSLog("[ShareExt] Error processing preprocessing: \(error)")
    }
  }

  // MARK: - Preview

  @MainActor
  private func updatePreview() {
    var parts: [String] = []

    let imageCount = processedFiles.filter { $0.mimeType.hasPrefix("image/") }.count
    let videoCount = processedFiles.filter { $0.mimeType.hasPrefix("video/") }.count
    let otherCount = processedFiles.count - imageCount - videoCount

    if imageCount > 0 { parts.append("\(imageCount) фото") }
    if videoCount > 0 { parts.append("\(videoCount) видео") }
    if otherCount > 0 { parts.append("\(otherCount) файл(ов)") }

    let textContent = (processedTexts + processedUrls).joined(separator: " ")
    if !textContent.isEmpty {
      let truncated =
        textContent.count > 100 ? String(textContent.prefix(100)) + "..." : textContent
      parts.append(truncated)
    }

    if parts.isEmpty {
      previewLabel.text = "Нет контента"
      previewIcon.image = UIImage(systemName: "exclamationmark.triangle")
    } else {
      previewLabel.text = parts.joined(separator: ", ")
      if !processedFiles.isEmpty {
        previewIcon.image = UIImage(systemName: imageCount > 0 ? "photo" : "doc")
      } else if !processedUrls.isEmpty {
        previewIcon.image = UIImage(systemName: "link")
      } else {
        previewIcon.image = UIImage(systemName: "text.quote")
      }
    }
  }

  // MARK: - Send

  private func sendToChat(chatId: Int) {
    guard !isSending else { return }
    guard isContentReady else {
      showLoading("Обработка контента...")
      return
    }

    isSending = true
    selectedChatId = chatId
    showLoading("Отправка...")

    if processedFiles.isEmpty {
      let content = (processedTexts + processedUrls).joined(separator: "\n")
      postMessage(chatId: chatId, content: content, fileIds: [])
    } else {
      uploadAllFiles { [weak self] result in
        guard let self = self else { return }
        switch result {
        case .success(let fileIds):
          let textContent = (self.processedTexts + self.processedUrls).joined(separator: "\n")
          self.postMessage(chatId: chatId, content: textContent, fileIds: fileIds)
        case .failure(let error):
          DispatchQueue.main.async {
            self.isSending = false
            self.showError(error.localizedDescription)
          }
        }
      }
    }
  }

  // MARK: - File Upload

  private func uploadAllFiles(completion: @escaping (Result<[Int], Error>) -> Void) {
    let group = DispatchGroup()
    var fileIds: [Int] = []
    var uploadError: Error?
    let lock = NSLock()

    for file in processedFiles {
      group.enter()
      uploadFile(file) { result in
        lock.lock()
        switch result {
        case .success(let id):
          fileIds.append(id)
        case .failure(let error):
          if uploadError == nil { uploadError = error }
        }
        lock.unlock()
        group.leave()
      }
    }

    group.notify(queue: .main) {
      if let error = uploadError {
        completion(.failure(error))
      } else {
        completion(.success(fileIds))
      }
    }
  }

  private func uploadFile(_ file: ProcessedFile, completion: @escaping (Result<Int, Error>) -> Void)
  {
    guard let baseUrl = apiBaseUrl, let session = sessionId else {
      completion(.failure(ShareError.noAuth))
      return
    }

    guard let url = URL(string: "\(baseUrl)/files/upload") else {
      completion(.failure(ShareError.uploadFailed(0)))
      return
    }

    let boundary = UUID().uuidString
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue(session, forHTTPHeaderField: "X-Session-ID")
    request.setValue(
      "multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 120

    // Build multipart body to a temp file (memory-efficient)
    let bodyFileURL = buildMultipartBody(file: file, boundary: boundary)

    let task = URLSession.shared.uploadTask(with: request, fromFile: bodyFileURL) {
      data, response, error in
      // Clean up temp body file
      try? FileManager.default.removeItem(at: bodyFileURL)

      if let error = error {
        completion(.failure(ShareError.networkError(error)))
        return
      }

      let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0

      if statusCode == 401 {
        completion(.failure(ShareError.sessionExpired))
        return
      }

      guard let data = data,
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let fileId = json["id"] as? Int
      else {
        completion(.failure(ShareError.uploadFailed(statusCode)))
        return
      }

      completion(.success(fileId))
    }
    task.resume()
  }

  private func buildMultipartBody(file: ProcessedFile, boundary: String) -> URL {
    let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
    FileManager.default.createFile(atPath: tempURL.path, contents: nil)
    guard let handle = FileHandle(forWritingAtPath: tempURL.path) else { return tempURL }

    let fileType = determineFileType(mimeType: file.mimeType)

    // file_type field
    handle.write("--\(boundary)\r\n".data(using: .utf8)!)
    handle.write(
      "Content-Disposition: form-data; name=\"file_type\"\r\n\r\n".data(using: .utf8)!)
    handle.write("\(fileType)\r\n".data(using: .utf8)!)

    // is_public field — chat attachments must be public so all members can access them
    handle.write("--\(boundary)\r\n".data(using: .utf8)!)
    handle.write(
      "Content-Disposition: form-data; name=\"is_public\"\r\n\r\n".data(using: .utf8)!)
    handle.write("true\r\n".data(using: .utf8)!)

    // file field header
    handle.write("--\(boundary)\r\n".data(using: .utf8)!)
    handle.write(
      "Content-Disposition: form-data; name=\"file\"; filename=\"\(file.fileName)\"\r\n".data(
        using: .utf8)!)
    handle.write("Content-Type: \(file.mimeType)\r\n\r\n".data(using: .utf8)!)

    // Stream file data in chunks
    if let readHandle = FileHandle(forReadingAtPath: file.localURL.path) {
      while autoreleasepool(invoking: {
        let chunk = readHandle.readData(ofLength: 65536)
        if chunk.isEmpty { return false }
        handle.write(chunk)
        return true
      }) {}
      readHandle.closeFile()
    }

    handle.write("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
    handle.closeFile()

    return tempURL
  }

  private func determineFileType(mimeType: String) -> String {
    if mimeType.hasPrefix("image/") { return "image" }
    if mimeType.hasPrefix("video/") { return "video" }
    if mimeType.hasPrefix("audio/") { return "audio" }
    return "document"
  }

  // MARK: - Send Message

  private func postMessage(chatId: Int, content: String, fileIds: [Int]) {
    guard let baseUrl = apiBaseUrl, let session = sessionId else {
      showError("Не авторизован")
      return
    }

    guard let url = URL(string: "\(baseUrl)/messages") else { return }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue(session, forHTTPHeaderField: "X-Session-ID")
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.timeoutInterval = 30

    var body: [String: Any] = ["chat_id": chatId]
    if !content.isEmpty {
      body["content"] = content
    }
    if !fileIds.isEmpty {
      body["file_ids"] = fileIds
    }

    request.httpBody = try? JSONSerialization.data(withJSONObject: body)

    URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
      DispatchQueue.main.async {
        if let error = error {
          self?.isSending = false
          self?.showError("Ошибка: \(error.localizedDescription)")
          return
        }

        let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0

        if statusCode == 401 {
          self?.isSending = false
          self?.showError("Сессия истекла. Откройте Тахион и войдите снова")
          return
        }

        if statusCode >= 200 && statusCode < 300 {
          self?.showSuccess()
        } else {
          self?.isSending = false
          self?.showError("Ошибка отправки (код \(statusCode))")
        }
      }
    }.resume()
  }

  // MARK: - Status

  private func showLoading(_ message: String) {
    statusOverlay.isHidden = false
    statusSpinner.isHidden = false
    statusSpinner.startAnimating()
    statusIcon.isHidden = true
    statusLabel.text = message
    cancelButton.isEnabled = false
  }

  private func hideLoading() {
    statusOverlay.isHidden = true
    statusSpinner.stopAnimating()
    cancelButton.isEnabled = true
  }

  private func showSuccess() {
    statusOverlay.isHidden = false
    statusSpinner.stopAnimating()
    statusSpinner.isHidden = true
    statusIcon.isHidden = false
    statusIcon.image = UIImage(systemName: "checkmark.circle.fill")
    statusIcon.tintColor = .systemGreen
    statusLabel.text = "Отправлено"

    DispatchQueue.main.asyncAfter(deadline: .now() + 1.2) { [weak self] in
      self?.cleanupAndDismiss()
    }
  }

  private func showError(_ message: String) {
    statusOverlay.isHidden = false
    statusSpinner.stopAnimating()
    statusSpinner.isHidden = true
    statusIcon.isHidden = false
    statusIcon.image = UIImage(systemName: "exclamationmark.circle.fill")
    statusIcon.tintColor = .systemRed
    statusLabel.text = message
    cancelButton.isEnabled = true

    // Add tap to dismiss
    let tap = UITapGestureRecognizer(target: self, action: #selector(errorOverlayTapped))
    statusOverlay.addGestureRecognizer(tap)
  }

  @objc private func errorOverlayTapped() {
    if !isSending {
      hideLoading()
    }
  }

  private func updateEmptyState() {
    emptyLabel.isHidden = !filteredChats.isEmpty
  }

  // MARK: - Actions

  @objc private func cancelTapped() {
    cleanupAndDismiss()
  }

  private func cleanupAndDismiss() {
    // Clean up processed files from container
    for file in processedFiles {
      try? FileManager.default.removeItem(at: file.localURL)
    }
    extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
  }

  // MARK: - File Helpers

  private func containerURL() -> URL {
    return FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier)!
  }

  private func saveImageToContainer(_ image: UIImage) -> URL? {
    guard let data = image.pngData() else { return nil }
    let fileName = "\(UUID().uuidString).png"
    let url = containerURL().appendingPathComponent(fileName)
    do {
      try data.write(to: url)
      return url
    } catch {
      NSLog("[ShareExt] Failed to save image: \(error)")
      return nil
    }
  }

  enum SharedMediaType: Int, Codable {
    case image
    case video
    case file
  }

  func getExtension(from url: URL, type: SharedMediaType) -> String {
    let parts = url.lastPathComponent.components(separatedBy: ".")
    if parts.count > 1, let ext = parts.last, !ext.isEmpty {
      return ext
    }
    switch type {
    case .image: return "png"
    case .video: return "mp4"
    case .file: return "bin"
    }
  }

  func getFileName(from url: URL, type: SharedMediaType) -> String {
    let name = url.lastPathComponent
    if name.isEmpty {
      return "\(UUID().uuidString).\(getExtension(from: url, type: type))"
    }
    return name
  }

  func getFileSize(from url: URL) -> Int? {
    return (try? url.resourceValues(forKeys: [.fileSizeKey]))?.fileSize
  }

  func copyFile(at srcURL: URL, to dstURL: URL) -> Bool {
    do {
      if FileManager.default.fileExists(atPath: dstURL.path) {
        try FileManager.default.removeItem(at: dstURL)
      }
      try FileManager.default.copyItem(at: srcURL, to: dstURL)
      return true
    } catch {
      NSLog("[ShareExt] Cannot copy \(srcURL) to \(dstURL): \(error)")
      return false
    }
  }
}

// MARK: - UITableViewDataSource & Delegate

extension ShareViewController: UITableViewDataSource, UITableViewDelegate {
  func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
    return filteredChats.count
  }

  func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
    let cell = tableView.dequeueReusableCell(withIdentifier: "ChatCell", for: indexPath) as! ChatCell
    let chat = filteredChats[indexPath.row]
    cell.configure(with: chat, cache: &avatarCache)
    return cell
  }

  func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
    tableView.deselectRow(at: indexPath, animated: true)
    guard !isSending else { return }
    let chat = filteredChats[indexPath.row]
    sendToChat(chatId: chat.id)
  }
}

// MARK: - UISearchBarDelegate

extension ShareViewController: UISearchBarDelegate {
  func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
    if searchText.isEmpty {
      filteredChats = allChats
    } else {
      filteredChats = allChats.filter {
        $0.name.localizedCaseInsensitiveContains(searchText)
      }
    }
    updateEmptyState()
    tableView.reloadData()
  }

  func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
    searchBar.resignFirstResponder()
  }
}

// MARK: - ChatCell

class ChatCell: UITableViewCell {
  private let avatarView = UIImageView()
  private let initialsLabel = UILabel()
  private let nameLabel = UILabel()
  private let messageLabel = UILabel()
  private let savedIcon = UIImageView()

  override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
    super.init(style: style, reuseIdentifier: reuseIdentifier)
    setupViews()
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  private func setupViews() {
    avatarView.layer.cornerRadius = 22
    avatarView.clipsToBounds = true
    avatarView.contentMode = .scaleAspectFill
    avatarView.backgroundColor = .systemGray5
    avatarView.translatesAutoresizingMaskIntoConstraints = false
    contentView.addSubview(avatarView)

    initialsLabel.font = .systemFont(ofSize: 16, weight: .medium)
    initialsLabel.textColor = .white
    initialsLabel.textAlignment = .center
    initialsLabel.translatesAutoresizingMaskIntoConstraints = false
    avatarView.addSubview(initialsLabel)

    savedIcon.image = UIImage(systemName: "bookmark.fill")
    savedIcon.tintColor = .systemBlue
    savedIcon.contentMode = .scaleAspectFit
    savedIcon.isHidden = true
    savedIcon.translatesAutoresizingMaskIntoConstraints = false
    contentView.addSubview(savedIcon)

    nameLabel.font = .systemFont(ofSize: 16, weight: .medium)
    nameLabel.translatesAutoresizingMaskIntoConstraints = false
    contentView.addSubview(nameLabel)

    messageLabel.font = .systemFont(ofSize: 13)
    messageLabel.textColor = .secondaryLabel
    messageLabel.lineBreakMode = .byTruncatingTail
    messageLabel.translatesAutoresizingMaskIntoConstraints = false
    contentView.addSubview(messageLabel)

    NSLayoutConstraint.activate([
      avatarView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
      avatarView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
      avatarView.widthAnchor.constraint(equalToConstant: 44),
      avatarView.heightAnchor.constraint(equalToConstant: 44),

      initialsLabel.centerXAnchor.constraint(equalTo: avatarView.centerXAnchor),
      initialsLabel.centerYAnchor.constraint(equalTo: avatarView.centerYAnchor),

      savedIcon.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
      savedIcon.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
      savedIcon.widthAnchor.constraint(equalToConstant: 44),
      savedIcon.heightAnchor.constraint(equalToConstant: 44),

      nameLabel.leadingAnchor.constraint(equalTo: avatarView.trailingAnchor, constant: 12),
      nameLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
      nameLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 10),

      messageLabel.leadingAnchor.constraint(equalTo: nameLabel.leadingAnchor),
      messageLabel.trailingAnchor.constraint(equalTo: nameLabel.trailingAnchor),
      messageLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: 2),
    ])
  }

  func configure(with chat: ShareChat, cache: inout [String: UIImage]) {
    nameLabel.text = chat.name
    messageLabel.text = chat.last_message_content ?? ""

    if chat.type == "saved" {
      savedIcon.isHidden = false
      avatarView.isHidden = true
      nameLabel.text = "Избранное"
    } else {
      savedIcon.isHidden = true
      avatarView.isHidden = false
      loadAvatar(url: chat.avatar, name: chat.name, cache: &cache)
    }
  }

  private func loadAvatar(url: String?, name: String, cache: inout [String: UIImage]) {
    // Set initials as placeholder
    let initials = getInitials(from: name)
    initialsLabel.text = initials
    avatarView.backgroundColor = colorForName(name)
    avatarView.image = nil

    guard let urlStr = url, !urlStr.isEmpty, let imageURL = URL(string: urlStr) else {
      return
    }

    // Check cache
    if let cached = cache[urlStr] {
      avatarView.image = cached
      initialsLabel.text = nil
      return
    }

    let cacheKey = urlStr
    URLSession.shared.dataTask(with: imageURL) { [weak self] data, _, _ in
      guard let data = data, let image = UIImage(data: data) else { return }
      DispatchQueue.main.async {
        self?.avatarView.image = image
        self?.initialsLabel.text = nil
      }
      // Note: cache is value type; can't update from closure. Just set on cell.
    }.resume()
  }

  private func getInitials(from name: String) -> String {
    let words = name.components(separatedBy: " ").filter { !$0.isEmpty }
    if words.count >= 2 {
      return String(words[0].prefix(1) + words[1].prefix(1)).uppercased()
    }
    return String(name.prefix(2)).uppercased()
  }

  private func colorForName(_ name: String) -> UIColor {
    let colors: [UIColor] = [
      .systemRed, .systemBlue, .systemGreen, .systemOrange,
      .systemPurple, .systemTeal, .systemPink, .systemIndigo,
    ]
    let hash = abs(name.hashValue)
    return colors[hash % colors.count]
  }

  override func prepareForReuse() {
    super.prepareForReuse()
    avatarView.image = nil
    avatarView.isHidden = false
    savedIcon.isHidden = true
    initialsLabel.text = nil
  }
}

// MARK: - MIME Types

internal let mimeTypes = [
  "html": "text/html",
  "htm": "text/html",
  "css": "text/css",
  "xml": "text/xml",
  "gif": "image/gif",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "js": "application/javascript",
  "json": "application/json",
  "txt": "text/plain",
  "png": "image/png",
  "tif": "image/tiff",
  "tiff": "image/tiff",
  "bmp": "image/x-ms-bmp",
  "svg": "image/svg+xml",
  "webp": "image/webp",
  "ico": "image/x-icon",
  "doc": "application/msword",
  "pdf": "application/pdf",
  "rtf": "application/rtf",
  "xls": "application/vnd.ms-excel",
  "ppt": "application/vnd.ms-powerpoint",
  "7z": "application/x-7z-compressed",
  "rar": "application/x-rar-compressed",
  "zip": "application/zip",
  "epub": "application/epub+zip",
  "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "mp3": "audio/mpeg",
  "ogg": "audio/ogg",
  "m4a": "audio/x-m4a",
  "mp4": "video/mp4",
  "mpeg": "video/mpeg",
  "mov": "video/quicktime",
  "webm": "video/webm",
  "avi": "video/x-msvideo",
  "wmv": "video/x-ms-wmv",
  "m4v": "video/x-m4v",
  "flv": "video/x-flv",
  "3gp": "video/3gpp",
  "mkv": "video/x-matroska",
  "heic": "image/heic",
  "heif": "image/heif",
  "pkpass": "application/vnd.apple.pkpass",
  "vcf": "text/vcard",
]

extension URL {
  func mimeType(ext: String?) -> String {
    if let pathExt = ext,
      let mimeType = UTType(filenameExtension: pathExt)?.preferredMIMEType
    {
      return mimeType
    }
    return mimeTypes[ext?.lowercased() ?? ""] ?? "application/octet-stream"
  }
}
