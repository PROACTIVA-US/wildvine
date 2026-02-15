package com.wildvine.android.ui

import androidx.compose.runtime.Composable
import com.wildvine.android.MainViewModel
import com.wildvine.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
