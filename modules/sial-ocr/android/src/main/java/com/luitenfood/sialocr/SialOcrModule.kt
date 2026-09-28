package com.luitenfood.sialocr

import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SialOcrModule : Module() {
  private val recognizer by lazy { TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS) }

  override fun definition() = ModuleDefinition {
    Name("SialOcr")

    // Returns the recognised text as blocks of lines, in reading order.
    AsyncFunction("recognize") { uri: String, promise: Promise ->
      try {
        val context = appContext.reactContext ?: throw Exception("No React context")
        val image = InputImage.fromFilePath(context, Uri.parse(uri))
        recognizer.process(image)
          .addOnSuccessListener { result ->
            promise.resolve(result.textBlocks.map { block -> block.lines.map { it.text } })
          }
          .addOnFailureListener { e -> promise.reject(CodedException("OCR_FAILED", e.message ?: "OCR failed", e)) }
      } catch (e: Exception) {
        promise.reject(CodedException("OCR_FAILED", e.message ?: "OCR failed", e))
      }
    }
  }
}
